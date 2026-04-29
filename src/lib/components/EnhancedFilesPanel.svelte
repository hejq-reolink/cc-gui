<script lang="ts">
  import type { FileEntry, GitSummary } from "$lib/types";
  import { splitPath } from "$lib/utils/format";
  import { mergeFilesForReview, statusColor, fileSummaryText } from "$lib/utils/file-review";
  import { t } from "$lib/i18n/index.svelte";

  let {
    fileEntries = [],
    gitSummary = null,
    onScrollToTool,
    onOpenReview,
  }: {
    fileEntries: FileEntry[];
    gitSummary: GitSummary | null;
    onScrollToTool?: (toolUseId: string) => void;
    onOpenReview?: (file?: string) => void;
  } = $props();

  let reviewFiles = $derived(
    mergeFilesForReview(fileEntries, gitSummary?.files ?? []),
  );

  let summaryText = $derived(fileSummaryText(gitSummary));

  function shortPath(p: string): string {
    const parts = splitPath(p);
    return parts.length > 2 ? "…/" + parts.slice(-2).join("/") : p;
  }
</script>

<div class="flex flex-col h-full overflow-hidden">
  {#if reviewFiles.length === 0 && fileEntries.length === 0}
    <div class="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
      {t("filesPanel_noFiles")}
    </div>
  {:else}
    {#if summaryText}
      <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between">
        <span class="text-[11px] text-muted-foreground">{summaryText}</span>
        {#if onOpenReview && gitSummary && gitSummary.files.length > 0}
          <button
            class="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            onclick={() => onOpenReview?.()}
          >
            {t("filesPanel_reviewAll")}
          </button>
        {/if}
      </div>
    {/if}

    <div class="flex-1 overflow-y-auto py-1">
      {#each reviewFiles as file (file.path)}
        {@const sc = statusColor(file.status)}
        <button
          class="w-full text-left px-2.5 py-1 hover:bg-accent/50 rounded-md transition-colors group"
          onclick={() => {
            if (file.toolUseId && onScrollToTool) onScrollToTool(file.toolUseId);
            else if (onOpenReview) onOpenReview(file.path);
          }}
        >
          <div class="flex items-center gap-1.5">
            <span
              class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold {sc.bg} {sc.text}"
            >
              {sc.label}
            </span>
            <span class="text-[11px] text-foreground truncate min-w-0 flex-1 group-hover:underline">
              {shortPath(file.path)}
            </span>
            {#if file.insertions > 0 || file.deletions > 0}
              <span class="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                {#if file.insertions > 0}<span class="text-emerald-500">+{file.insertions}</span>{/if}
                {#if file.deletions > 0}<span class="text-red-500 ml-0.5">-{file.deletions}</span>{/if}
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>
