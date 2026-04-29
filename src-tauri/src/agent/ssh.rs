//! SSH command builder for remote Claude Code execution.
//!
//! Uses the system `ssh` binary — no new crate dependencies.
//! All remote commands are shell-escaped to prevent injection.

use crate::models::RemoteHost;
use crate::process_ext::HideConsole;
use tokio::process::Command;

/// Shell-escape a string using single quotes (POSIX-safe).
/// Any embedded single quote is replaced with `'\''` (end quote, escaped quote, start quote).
pub fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

/// Shell-escape a path, preserving leading `~/` for shell tilde expansion on the remote host.
/// `~/projects/my app` → `~/'projects/my app'` (tilde outside quotes, rest escaped).
fn shell_escape_path(s: &str) -> String {
    if let Some(rest) = s.strip_prefix("~/") {
        format!("~/{}", shell_escape(rest))
    } else {
        shell_escape(s)
    }
}

/// Expand `~` to `$HOME` for local filesystem paths (e.g. SSH key paths).
/// Unlike shell_escape_path, this does actual expansion since `Command::arg()` doesn't go through a shell.
pub fn expand_local_tilde(path: &str) -> String {
    if let Some(rest) = path.strip_prefix("~/") {
        if let Some(home) = crate::storage::home_dir() {
            let mut p = std::path::PathBuf::from(&home);
            p.push(rest);
            return p.to_string_lossy().into_owned();
        }
    }
    path.to_string()
}

/// Extract port from a localhost URL (e.g. "http://localhost:4141/v1" → Some(4141)).
pub fn extract_localhost_port(url: &str) -> Option<u16> {
    let url_lower = url.to_ascii_lowercase();
    let after_scheme = url_lower
        .strip_prefix("http://")
        .or_else(|| url_lower.strip_prefix("https://"))?;
    let host_port = after_scheme.split('/').next()?;
    let (host, port_str) = if let Some(idx) = host_port.rfind(':') {
        (&host_port[..idx], &host_port[idx + 1..])
    } else {
        return None;
    };
    if host != "localhost" && host != "127.0.0.1" {
        return None;
    }
    port_str.parse::<u16>().ok()
}

/// Build an SSH `Command` that runs `remote_shell_command` on the remote host.
/// When password auth is used (password set, no key_path), BatchMode is skipped
/// and the caller must pipe the password to stdin.
/// `reverse_forward_ports` adds `-R port:localhost:port` for each port so the
/// remote host can reach local services (e.g. a localhost API proxy).
pub fn build_ssh_command(
    remote: &RemoteHost,
    remote_shell_command: &str,
    reverse_forward_ports: &[u16],
) -> Command {
    let mut cmd = Command::new("ssh");
    cmd.hide_console();

    let use_password = remote.password.is_some() && remote.key_path.is_none();
    if !use_password {
        cmd.arg("-o").arg("BatchMode=yes");
    }

    cmd.arg("-o").arg("ServerAliveInterval=30");
    cmd.arg("-o").arg("StrictHostKeyChecking=accept-new");

    if remote.port != 22 {
        cmd.arg("-p").arg(remote.port.to_string());
    }
    if let Some(ref key) = remote.key_path {
        cmd.arg("-i").arg(expand_local_tilde(key));
    }

    for port in reverse_forward_ports {
        cmd.arg("-R").arg(format!("{}:localhost:{}", port, port));
    }

    let target = format!("{}@{}", remote.user, remote.host);
    cmd.arg(&target);
    cmd.arg(remote_shell_command);

    log::debug!(
        "[ssh] build_ssh_command: target={}, port={}, key={:?}, password={}, reverse_ports={:?}, cmd_len={}",
        target,
        remote.port,
        remote.key_path,
        use_password,
        reverse_forward_ports,
        remote_shell_command.len()
    );

    cmd
}

/// Build the shell command string to run Claude CLI on the remote host.
///
/// - `cwd`: Already-snapshotted remote_cwd from RunMeta (audit #4).
/// - `claude_args`: CLI arguments (e.g. `["--output-format", "stream-json", ...]`).
/// - `api_key`: Anthropic official API key (`x-api-key` header).
/// - `auth_token`: Third-party platform token (`Authorization: Bearer` header).
/// - `base_url`: Custom API endpoint URL.
#[allow(clippy::too_many_arguments)]
pub fn build_remote_claude_command(
    remote: &RemoteHost,
    cwd: &str,
    claude_args: &[String],
    api_key: Option<&str>,
    auth_token: Option<&str>,
    base_url: Option<&str>,
    models: Option<&[String]>,
    extra_env: Option<&std::collections::HashMap<String, String>>,
) -> String {
    let claude_bin = remote.remote_claude_path.as_deref().unwrap_or("claude");

    let mut parts = Vec::new();

    // cd to remote working directory (preserves ~/... expansion)
    parts.push(format!("cd {}", shell_escape_path(cwd)));

    // Build the claude command with optional env var prefixes
    let mut claude_parts = Vec::new();
    if let Some(key) = api_key {
        claude_parts.push(format!("ANTHROPIC_API_KEY={}", shell_escape(key)));
        // Clear AUTH_TOKEN to avoid remote shell env vars interfering
        claude_parts.push("ANTHROPIC_AUTH_TOKEN=".to_string());
    }
    if let Some(token) = auth_token {
        claude_parts.push(format!("ANTHROPIC_AUTH_TOKEN={}", shell_escape(token)));
        // Clear API_KEY to avoid conflict
        claude_parts.push("ANTHROPIC_API_KEY=".to_string());
    }
    if let Some(url) = base_url {
        claude_parts.push(format!("ANTHROPIC_BASE_URL={}", shell_escape(url)));
    }
    // Inject model tier env vars for third-party platforms
    if let Some(m) = models {
        for (k, v) in crate::commands::session::resolve_model_tiers(m) {
            claude_parts.push(format!("{}={}", k, shell_escape(&v)));
        }
    }
    // Inject extra env vars (only allow safe key names: [A-Z0-9_])
    if let Some(extra) = extra_env {
        for (k, v) in extra {
            if k.chars()
                .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || c == '_')
            {
                claude_parts.push(format!("{}={}", k, shell_escape(v)));
            } else {
                log::warn!("[ssh] skipping extra_env key with invalid chars: {}", k);
            }
        }
    }
    // Enable file checkpointing in SDK/non-interactive mode
    claude_parts.push("CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING=1".to_string());
    // Escape claude binary path (preserves ~/... expansion)
    claude_parts.push(shell_escape_path(claude_bin));
    for arg in claude_args {
        claude_parts.push(shell_escape(arg));
    }

    parts.push(claude_parts.join(" "));

    let full_cmd = parts.join(" && ");
    log::debug!(
        "[ssh] build_remote_claude_command: cwd={}, bin={}, args={}, has_key={}, has_token={}, has_url={}, has_model={}, extra_env_count={}",
        cwd,
        claude_bin,
        claude_args.len(),
        api_key.is_some(),
        auth_token.is_some(),
        base_url.is_some(),
        models.is_some(),
        extra_env.map_or(0, |e| e.len())
    );

    full_cmd
}
