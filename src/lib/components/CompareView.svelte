<script lang="ts">
  import type { SessionStore } from "$lib/stores/session-store.svelte";
  import { formatTokenCount, formatCostDisplay } from "$lib/utils/format";
  import { t } from "$lib/i18n/index.svelte";
  import Modal from "./Modal.svelte";

  let {
    open = $bindable(false),
    storeA,
    storeB,
    labelA = "Session A",
    labelB = "Session B",
  }: {
    open?: boolean;
    storeA: SessionStore;
    storeB: SessionStore;
    labelA?: string;
    labelB?: string;
  } = $props();

  function messageEntries(store: SessionStore) {
    return store.timeline.filter((e) => e.kind === "user" || e.kind === "assistant");
  }

  function truncateContent(text: string, max = 500): string {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }
</script>

<Modal bind:open title={t("compareView_title")} maxWidth="max-w-7xl">
  <div class="flex gap-4 -mx-6 -mb-6 h-[75vh]">
    {#each [[storeA, labelA], [storeB, labelB]] as [store, label] (label)}
      {@const s = store as SessionStore}
      {@const msgs = messageEntries(s)}
      <div class="flex-1 flex flex-col border-r last:border-r-0 border-border/50 overflow-hidden">
        <div class="px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-foreground">{label}</span>
            <span class="text-[10px] text-muted-foreground">{s.model || "—"}</span>
          </div>
          <div class="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span>
              {formatTokenCount(s.usage.inputTokens + s.usage.cacheReadTokens + s.usage.cacheWriteTokens)} in
            </span>
            <span>{formatTokenCount(s.usage.outputTokens)} out</span>
            <span>{formatCostDisplay(s.usage.cost)}</span>
            <span>{msgs.length} msgs</span>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          {#if msgs.length === 0}
            <div class="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
              {t("compareView_noTimeline")}
            </div>
          {:else}
            {#each msgs as entry (entry.id)}
              <div class="rounded-lg px-3 py-2 text-xs {entry.kind === 'user'
                ? 'bg-primary/5 border border-primary/10'
                : 'bg-muted/30 border border-border/30'}">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-semibold uppercase tracking-wider {entry.kind === 'user' ? 'text-primary' : 'text-muted-foreground'}">
                    {entry.kind === "user" ? "User" : "Assistant"}
                  </span>
                  {#if entry.ts}
                    <span class="text-[9px] text-muted-foreground/50">
                      {new Date(entry.ts).toLocaleTimeString()}
                    </span>
                  {/if}
                </div>
                <div class="text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
                  {truncateContent(entry.content)}
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</Modal>
