use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

pub struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn portable_pty::MasterPty + Send>,
    #[allow(dead_code)]
    child: Box<dyn portable_pty::Child + Send>,
    reader_handle: JoinHandle<()>,
}

pub type PtySessionMap = Arc<Mutex<HashMap<String, PtySession>>>;

pub fn new_pty_session_map() -> PtySessionMap {
    Arc::new(Mutex::new(HashMap::new()))
}

#[derive(Clone, Serialize)]
struct PtyOutputPayload {
    id: String,
    data: Vec<u8>,
}

#[derive(Clone, Serialize)]
struct PtyExitPayload {
    id: String,
    code: Option<u32>,
}

fn detect_shell() -> (String, Vec<String>) {
    #[cfg(windows)]
    {
        if let Ok(pwsh) = std::process::Command::new("pwsh")
            .arg("--version")
            .output()
        {
            if pwsh.status.success() {
                return ("pwsh".to_string(), vec!["-NoLogo".to_string()]);
            }
        }
        ("powershell.exe".to_string(), vec!["-NoLogo".to_string()])
    }
    #[cfg(not(windows))]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
        (shell, vec![])
    }
}

#[tauri::command]
pub async fn pty_spawn(
    app: AppHandle,
    pty_map: State<'_, PtySessionMap>,
    id: String,
    cwd: String,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    log::debug!(
        "[terminal] pty_spawn: id={}, cwd={}, cols={}, rows={}",
        id, cwd, cols, rows
    );

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    let (shell, shell_args) = detect_shell();
    let mut cmd = CommandBuilder::new(&shell);
    for arg in &shell_args {
        cmd.arg(arg);
    }
    cmd.cwd(&cwd);
    cmd.env("TERM", "xterm-256color");

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    let pid = child.process_id().unwrap_or(0);

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to clone PTY reader: {}", e))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to take PTY writer: {}", e))?;

    let emit_id = id.clone();
    let reader_handle = tokio::task::spawn_blocking(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let _ = app.emit(
                        "pty-output",
                        PtyOutputPayload {
                            id: emit_id.clone(),
                            data: buf[..n].to_vec(),
                        },
                    );
                }
                Err(e) => {
                    log::debug!("[terminal] reader error for {}: {}", emit_id, e);
                    break;
                }
            }
        }
        let _ = app.emit(
            "pty-exit",
            PtyExitPayload {
                id: emit_id,
                code: None,
            },
        );
    });

    let session = PtySession {
        writer,
        master: pair.master,
        child,
        reader_handle,
    };

    pty_map.lock().await.insert(id.clone(), session);
    log::debug!("[terminal] spawned: id={}, pid={}", id, pid);
    Ok(pid)
}

#[tauri::command]
pub async fn pty_write(
    pty_map: State<'_, PtySessionMap>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut map = pty_map.lock().await;
    let session = map
        .get_mut(&id)
        .ok_or_else(|| format!("PTY session not found: {}", id))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("PTY write failed: {}", e))?;
    session
        .writer
        .flush()
        .map_err(|e| format!("PTY flush failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn pty_resize(
    pty_map: State<'_, PtySessionMap>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    log::debug!("[terminal] pty_resize: id={}, cols={}, rows={}", id, cols, rows);
    let map = pty_map.lock().await;
    let session = map
        .get(&id)
        .ok_or_else(|| format!("PTY session not found: {}", id))?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("PTY resize failed: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn pty_close(pty_map: State<'_, PtySessionMap>, id: String) -> Result<(), String> {
    log::debug!("[terminal] pty_close: id={}", id);
    let mut map = pty_map.lock().await;
    if let Some(mut session) = map.remove(&id) {
        let _ = session.child.kill();
        session.reader_handle.abort();
    }
    Ok(())
}

pub async fn cleanup_all(pty_map: &PtySessionMap) {
    let sessions: Vec<(String, PtySession)> = {
        let mut map = pty_map.lock().await;
        map.drain().collect()
    };
    for (id, mut session) in sessions {
        log::debug!("[terminal] cleanup: killing PTY session {}", id);
        let _ = session.child.kill();
        session.reader_handle.abort();
    }
}
