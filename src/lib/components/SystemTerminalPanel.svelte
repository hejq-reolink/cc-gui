<script lang="ts">
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { t } from "$lib/i18n/index.svelte";
  import { ptySpawn, ptyWrite, ptyResize, ptyClose } from "$lib/api";
  import XTerminal from "./XTerminal.svelte";

  let {
    cwd = "/",
    class: className = "",
    onClose,
  }: {
    cwd?: string;
    class?: string;
    onClose?: () => void;
  } = $props();

  interface TabInfo {
    id: string;
    label: string;
    pid: number | null;
    exited: boolean;
  }

  let tabs: TabInfo[] = $state([]);
  let activeTabId = $state("");
  let panelHeight = $state(280);
  let dragging = $state(false);

  const termRefs: Record<string, ReturnType<typeof XTerminal>> = {};
  const unlisteners: Record<string, Array<() => void>> = {};

  function genId() {
    return `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function addTab() {
    const id = genId();
    const tab: TabInfo = { id, label: `Terminal ${tabs.length + 1}`, pid: null, exited: false };
    tabs = [...tabs, tab];
    activeTabId = id;

    const unlisten1 = await listen<{ id: string; data: number[] }>("pty-output", (ev) => {
      if (ev.payload.id !== id) return;
      const ref = termRefs[id];
      if (ref) {
        ref.writeData(new Uint8Array(ev.payload.data));
      }
    });

    const unlisten2 = await listen<{ id: string; code: number | null }>("pty-exit", (ev) => {
      if (ev.payload.id !== id) return;
      tabs = tabs.map((tb) => (tb.id === id ? { ...tb, exited: true } : tb));
      const ref = termRefs[id];
      if (ref) {
        ref.writeText(`\r\n\x1b[90m[${t("terminal_processExited")}]\x1b[0m\r\n`);
      }
    });

    unlisteners[id] = [unlisten1, unlisten2];
  }

  async function closeTab(id: string) {
    const fns = unlisteners[id];
    if (fns) {
      for (const fn of fns) fn();
      delete unlisteners[id];
    }
    try {
      await ptyClose(id);
    } catch {
      // already closed
    }
    delete termRefs[id];
    tabs = tabs.filter((tb) => tb.id !== id);
    if (activeTabId === id) {
      activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : "";
    }
  }

  function selectTab(id: string) {
    activeTabId = id;
    requestAnimationFrame(() => {
      termRefs[id]?.refit();
    });
  }

  async function handleReady(id: string, cols: number, rows: number) {
    try {
      const pid = await ptySpawn(id, cwd || "/", cols, rows);
      tabs = tabs.map((tb) => (tb.id === id ? { ...tb, pid } : tb));
    } catch (e) {
      const ref = termRefs[id];
      if (ref) {
        ref.writeText(`\x1b[31m${t("terminal_spawnFailed")}: ${e}\x1b[0m\r\n`);
      }
    }
  }

  function handleData(id: string, data: string) {
    ptyWrite(id, data);
  }

  function handleResize(id: string, cols: number, rows: number) {
    ptyResize(id, cols, rows).catch(() => {});
  }

  function onDragStart(e: MouseEvent) {
    e.preventDefault();
    dragging = true;
    const startY = e.clientY;
    const startH = panelHeight;

    function onMove(ev: MouseEvent) {
      const delta = startY - ev.clientY;
      panelHeight = Math.max(150, Math.min(startH + delta, window.innerHeight * 0.7));
    }
    function onUp() {
      dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  onMount(() => {
    addTab();
    return () => {
      for (const id of Object.keys(unlisteners)) {
        const fns = unlisteners[id];
        if (fns) for (const fn of fns) fn();
      }
      for (const id of tabs.map((t) => t.id)) {
        ptyClose(id).catch(() => {});
      }
    };
  });
</script>

<div
  class="system-terminal-panel flex flex-col {className}"
  style="height: {panelHeight}px;"
>
  <!-- Drag handle -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="terminal-drag-handle {dragging ? 'active' : ''}"
    onmousedown={onDragStart}
  >
    <div class="drag-pill"></div>
  </div>

  <!-- Glass header with tabs -->
  <div class="terminal-header">
    <div class="terminal-header-left">
      <!-- Terminal icon -->
      <svg class="w-3.5 h-3.5 text-primary/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
      </svg>
      <span class="text-xs font-medium text-foreground/70">{t("terminal_title")}</span>
    </div>

    <!-- Tabs -->
    <div class="terminal-tabs">
      {#each tabs as tab (tab.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="terminal-tab {tab.id === activeTabId ? 'active' : ''}"
          onclick={() => selectTab(tab.id)}
          onkeydown={(e) => { if (e.key === 'Enter') selectTab(tab.id); }}
          role="tab"
          tabindex="0"
        >
          <span class="tab-label">{tab.label}</span>
          {#if tab.exited}
            <span class="tab-exited">exited</span>
          {/if}
          <button
            class="tab-close"
            onclick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            title={t("terminal_closeTab")}
          >
            <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      {/each}

      <button
        class="tab-add"
        onclick={() => addTab()}
        title={t("terminal_newTab")}
      >
        <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <!-- Right controls -->
    <div class="terminal-header-right">
      {#if onClose}
        <button
          class="header-btn"
          onclick={onClose}
          title="Close terminal"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="7 13 12 18 17 13" /><polyline points="7 6 12 11 17 6" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- Terminal instances -->
  <div class="terminal-body">
    {#each tabs as tab (tab.id)}
      <div
        class="absolute inset-0"
        style="display: {tab.id === activeTabId ? 'block' : 'none'};"
      >
        <XTerminal
          bind:this={termRefs[tab.id]}
          class="h-full"
          onReady={(cols, rows) => handleReady(tab.id, cols, rows)}
          onData={(data) => handleData(tab.id, data)}
          onResize={(cols, rows) => handleResize(tab.id, cols, rows)}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .system-terminal-panel {
    --tp-bg: rgba(250, 250, 249, 0.92);
    --tp-border: rgba(0, 0, 0, 0.08);
    --tp-header-bg: rgba(0, 0, 0, 0.02);
    --tp-header-border: rgba(0, 0, 0, 0.06);
    --tp-drag-from: rgba(0, 0, 0, 0.03);
    --tp-drag-hover: rgba(0, 0, 0, 0.06);
    --tp-pill: rgba(0, 0, 0, 0.12);
    --tp-pill-hover: rgba(0, 0, 0, 0.25);
    --tp-text-dim: rgba(0, 0, 0, 0.35);
    --tp-text-med: rgba(0, 0, 0, 0.55);
    --tp-text-hi: rgba(0, 0, 0, 0.8);
    --tp-tab-hover: rgba(0, 0, 0, 0.04);
    --tp-tab-active-bg: rgba(0, 0, 0, 0.06);
    --tp-tab-active-ring: rgba(0, 0, 0, 0.06);
    --tp-close-hover: rgba(0, 0, 0, 0.08);
    --tp-body-bg: hsl(var(--background));

    position: relative;
    border-top: 1px solid var(--tp-border);
    background: var(--tp-bg);
    backdrop-filter: blur(20px) saturate(1.5);
    -webkit-backdrop-filter: blur(20px) saturate(1.5);
  }

  :global(.dark) .system-terminal-panel {
    --tp-bg: rgba(13, 13, 13, 0.88);
    --tp-border: rgba(255, 255, 255, 0.08);
    --tp-header-bg: rgba(255, 255, 255, 0.03);
    --tp-header-border: rgba(255, 255, 255, 0.06);
    --tp-drag-from: rgba(255, 255, 255, 0.04);
    --tp-drag-hover: rgba(255, 255, 255, 0.08);
    --tp-pill: rgba(255, 255, 255, 0.15);
    --tp-pill-hover: rgba(255, 255, 255, 0.3);
    --tp-text-dim: rgba(255, 255, 255, 0.4);
    --tp-text-med: rgba(255, 255, 255, 0.6);
    --tp-text-hi: rgba(255, 255, 255, 0.9);
    --tp-tab-hover: rgba(255, 255, 255, 0.05);
    --tp-tab-active-bg: rgba(255, 255, 255, 0.08);
    --tp-tab-active-ring: rgba(255, 255, 255, 0.06);
    --tp-close-hover: rgba(255, 255, 255, 0.1);
    --tp-body-bg: hsl(var(--background));
  }

  .terminal-drag-handle {
    height: 6px;
    cursor: ns-resize;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, var(--tp-drag-from) 0%, transparent 100%);
    transition: background 0.15s;
  }
  .terminal-drag-handle:hover,
  .terminal-drag-handle.active {
    background: linear-gradient(180deg, var(--tp-drag-hover) 0%, transparent 100%);
  }
  .drag-pill {
    width: 32px;
    height: 3px;
    border-radius: 2px;
    background: var(--tp-pill);
    transition: background 0.15s, width 0.15s;
  }
  .terminal-drag-handle:hover .drag-pill,
  .terminal-drag-handle.active .drag-pill {
    background: var(--tp-pill-hover);
    width: 48px;
  }

  .terminal-header {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 10px;
    background: var(--tp-header-bg);
    border-bottom: 1px solid var(--tp-header-border);
    flex-shrink: 0;
    -webkit-app-region: no-drag;
  }

  .terminal-header-left {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    padding-right: 8px;
    border-right: 1px solid var(--tp-header-border);
  }

  .terminal-tabs {
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .terminal-tabs::-webkit-scrollbar { display: none; }

  .terminal-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 11px;
    color: var(--tp-text-dim);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    user-select: none;
  }
  .terminal-tab:hover {
    color: var(--tp-text-med);
    background: var(--tp-tab-hover);
  }
  .terminal-tab.active {
    color: var(--tp-text-hi);
    background: var(--tp-tab-active-bg);
    box-shadow: inset 0 0 0 1px var(--tp-tab-active-ring);
  }

  .tab-label {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tab-exited {
    font-size: 9px;
    padding: 0 4px;
    border-radius: 3px;
    background: rgba(239, 68, 68, 0.15);
    color: rgba(239, 68, 68, 0.7);
  }

  .tab-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    border-radius: 3px;
    color: var(--tp-text-dim);
    transition: all 0.15s;
    opacity: 0;
  }
  .terminal-tab:hover .tab-close,
  .terminal-tab.active .tab-close {
    opacity: 1;
  }
  .tab-close:hover {
    color: var(--tp-text-hi);
    background: var(--tp-close-hover);
  }

  .tab-add {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 5px;
    color: var(--tp-text-dim);
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .tab-add:hover {
    color: var(--tp-text-med);
    background: var(--tp-tab-hover);
  }

  .terminal-header-right {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    margin-left: auto;
  }

  .header-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    color: var(--tp-text-dim);
    transition: all 0.15s;
  }
  .header-btn:hover {
    color: var(--tp-text-hi);
    background: var(--tp-close-hover);
  }

  .terminal-body {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #fafaf9;
  }

  :global(.dark) .terminal-body {
    background: #0d0d0d;
  }
</style>
