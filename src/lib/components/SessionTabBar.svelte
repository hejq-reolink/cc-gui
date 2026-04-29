<script lang="ts">
  import type { SessionTab } from "$lib/stores/tab-manager.svelte";
  import { t } from "$lib/i18n/index.svelte";

  let {
    tabs = [],
    activeTabId = "",
    onSwitch,
    onClose,
    onAdd,
    onRename,
    onCompare,
  }: {
    tabs: SessionTab[];
    activeTabId: string;
    onSwitch: (tabId: string) => void;
    onClose: (tabId: string) => void;
    onAdd: () => void;
    onRename?: (tabId: string, label: string) => void;
    onCompare?: (tabIdA: string, tabIdB: string) => void;
  } = $props();

  let editingTabId = $state<string | null>(null);
  let editValue = $state("");
  let contextMenuTabId = $state<string | null>(null);
  let contextMenuPos = $state({ x: 0, y: 0 });

  function phaseColor(tab: SessionTab): string {
    const phase = tab.store.phase;
    if (phase === "running" || phase === "tool_input") return "bg-emerald-400";
    if (phase === "idle" || phase === "completed") return "bg-blue-400";
    if (phase === "error") return "bg-red-400";
    return "bg-muted-foreground/30";
  }

  function startRename(tabId: string, currentLabel: string) {
    editingTabId = tabId;
    editValue = currentLabel;
    contextMenuTabId = null;
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-rename-input="${tabId}"]`);
      el?.focus();
      el?.select();
    });
  }

  function commitRename() {
    if (editingTabId && editValue.trim() && onRename) {
      onRename(editingTabId, editValue.trim());
    }
    editingTabId = null;
  }

  function handleContextMenu(e: MouseEvent, tabId: string) {
    e.preventDefault();
    contextMenuTabId = tabId;
    contextMenuPos = { x: e.clientX, y: e.clientY };
  }

  function closeContextMenu() {
    contextMenuTabId = null;
  }

  function handleCompare(tabId: string) {
    if (onCompare && activeTabId !== tabId) {
      onCompare(activeTabId, tabId);
    }
    closeContextMenu();
  }
</script>

<svelte:window onclick={closeContextMenu} />

<div class="flex items-center h-8 bg-muted/30 border-b border-border/50 px-1 gap-0.5 overflow-x-auto shrink-0">
  {#each tabs as tab (tab.id)}
    <button
      class="group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition-colors max-w-[180px] min-w-[80px] shrink-0
        {activeTabId === tab.id
          ? 'bg-background text-foreground shadow-sm border border-border/50'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}"
      onclick={() => onSwitch(tab.id)}
      oncontextmenu={(e) => handleContextMenu(e, tab.id)}
    >
      <span class="h-1.5 w-1.5 rounded-full shrink-0 {phaseColor(tab)}"></span>
      {#if editingTabId === tab.id}
        <input
          data-rename-input={tab.id}
          type="text"
          class="bg-transparent border-none outline-none text-[11px] w-full min-w-0 p-0"
          bind:value={editValue}
          onblur={commitRename}
          onkeydown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { editingTabId = null; }
          }}
        />
      {:else}
        <span class="truncate min-w-0 flex-1">{tab.label}</span>
      {/if}
      {#if tab.pinned}
        <span class="text-[8px] text-amber-500">●</span>
      {/if}
      {#if tabs.length > 1}
        <span
          role="button"
          tabindex="0"
          class="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity text-[10px] px-0.5 cursor-pointer"
          onclick={(e) => { e.stopPropagation(); onClose(tab.id); }}
          onkeydown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onClose(tab.id); } }}
          title={t("tabBar_closeTab")}
        >
          ×
        </span>
      {/if}
    </button>
  {/each}

  <button
    class="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0 text-sm"
    onclick={onAdd}
    title={t("tabBar_newTab")}
  >
    +
  </button>
</div>

{#if contextMenuTabId}
  {@const ctxTab = tabs.find((ct) => ct.id === contextMenuTabId)}
  {#if ctxTab}
    <div
      class="fixed z-[100] bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px] text-[11px]"
      style="left: {contextMenuPos.x}px; top: {contextMenuPos.y}px;"
    >
      <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" onclick={() => { startRename(ctxTab.id, ctxTab.label); }}>
        {t("tabBar_rename")}
      </button>
      {#if tabs.length > 1 && onCompare}
        <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors" onclick={() => handleCompare(ctxTab.id)}>
          {t("tabBar_compareWith")}
        </button>
      {/if}
      <button class="w-full text-left px-3 py-1.5 hover:bg-accent transition-colors text-red-500" onclick={() => { onClose(ctxTab.id); closeContextMenu(); }}>
        {t("tabBar_closeTab")}
      </button>
    </div>
  {/if}
{/if}
