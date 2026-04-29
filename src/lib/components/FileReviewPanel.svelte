<script lang="ts">
  import type { GitSummary } from "$lib/types";
  import { statusColor, type ReviewableFile } from "$lib/utils/file-review";
  import { splitPath } from "$lib/utils/format";
  import { getGitDiff } from "$lib/api";
  import { t } from "$lib/i18n/index.svelte";
  import Modal from "./Modal.svelte";

  let {
    open = $bindable(false),
    cwd = "",
    gitSummary = null,
    initialFile,
  }: {
    open?: boolean;
    cwd: string;
    gitSummary: GitSummary | null;
    initialFile?: string;
  } = $props();

  type Decision = "pending" | "accepted" | "rejected";

  let files = $derived<ReviewableFile[]>(
    (gitSummary?.files ?? []).map((f) => ({
      path: f.path,
      status: f.status,
      insertions: f.insertions,
      deletions: f.deletions,
    })),
  );

  let selectedPath = $state<string>("");
  let decisions = $state<Map<string, Decision>>(new Map());
  let diffContent = $state<string>("");
  let diffLoading = $state(false);

  $effect(() => {
    if (open && initialFile) {
      selectedPath = initialFile;
    } else if (open && files.length > 0 && !selectedPath) {
      selectedPath = files[0].path;
    }
  });

  $effect(() => {
    if (open && selectedPath && cwd) {
      loadDiff(selectedPath);
    }
  });

  async function loadDiff(path: string) {
    diffLoading = true;
    diffContent = "";
    try {
      diffContent = await getGitDiff(cwd, false, path);
    } catch {
      diffContent = "";
    }
    diffLoading = false;
  }

  function setDecision(path: string, d: Decision) {
    const next = new Map(decisions);
    next.set(path, d);
    decisions = next;
  }

  function getDecision(path: string): Decision {
    return decisions.get(path) ?? "pending";
  }

  function acceptAll() {
    const next = new Map(decisions);
    for (const f of files) next.set(f.path, "accepted");
    decisions = next;
  }

  function shortPath(p: string): string {
    const parts = splitPath(p);
    return parts.length > 3 ? "…/" + parts.slice(-3).join("/") : p;
  }

  function decisionIcon(d: Decision): string {
    if (d === "accepted") return "✓";
    if (d === "rejected") return "✗";
    return "·";
  }

  function decisionColor(d: Decision): string {
    if (d === "accepted") return "text-emerald-500";
    if (d === "rejected") return "text-red-500";
    return "text-muted-foreground/40";
  }

  let diffLines = $derived(diffContent.split("\n"));
  let selectedStatusColor = $derived(statusColor(files.find((f) => f.path === selectedPath)?.status ?? "?"));
  let selectedDecision = $derived(getDecision(selectedPath));
</script>

<Modal bind:open title={t("fileReview_title")} maxWidth="max-w-6xl">
  <div class="flex gap-0 -mx-6 -mb-6 h-[70vh]">
    <!-- Left: file list -->
    <div class="w-[250px] shrink-0 border-r border-border overflow-y-auto bg-muted/20">
      <div class="px-3 py-2 border-b border-border/50 flex items-center justify-between">
        <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t("filesPanel_summary")}
        </span>
        <button
          class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          onclick={acceptAll}
        >
          {t("fileReview_acceptAll")}
        </button>
      </div>
      {#each files as file (file.path)}
        {@const sc = statusColor(file.status)}
        {@const d = getDecision(file.path)}
        <button
          class="w-full text-left px-3 py-1.5 hover:bg-accent/50 transition-colors text-[11px] {selectedPath === file.path ? 'bg-accent' : ''}"
          onclick={() => (selectedPath = file.path)}
        >
          <div class="flex items-center gap-1.5">
            <span class="{decisionColor(d)} text-xs font-bold w-3 text-center">{decisionIcon(d)}</span>
            <span
              class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold {sc.bg} {sc.text}"
            >
              {sc.label}
            </span>
            <span class="truncate min-w-0 flex-1">{shortPath(file.path)}</span>
            {#if file.insertions > 0 || file.deletions > 0}
              <span class="text-[9px] font-mono tabular-nums shrink-0">
                {#if file.insertions > 0}<span class="text-emerald-500">+{file.insertions}</span>{/if}
                {#if file.deletions > 0}<span class="text-red-500">-{file.deletions}</span>{/if}
              </span>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <!-- Right: diff viewer -->
    <div class="flex-1 flex flex-col overflow-hidden">
      {#if selectedPath}
        <div class="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-muted/10">
          <div class="flex items-center gap-2">
            <span
              class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold {selectedStatusColor.bg} {selectedStatusColor.text}"
            >
              {selectedStatusColor.label}
            </span>
            <span class="text-xs text-foreground font-mono">{selectedPath}</span>
          </div>
          <div class="flex items-center gap-2">
            {#if selectedDecision === "pending"}
              <button
                class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                onclick={() => setDecision(selectedPath, "accepted")}
              >
                {t("fileReview_accept")}
              </button>
              <button
                class="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                onclick={() => setDecision(selectedPath, "rejected")}
              >
                {t("fileReview_reject")}
              </button>
            {:else}
              <span class="text-[10px] {selectedDecision === 'accepted' ? 'text-emerald-500' : 'text-red-500'}">
                {selectedDecision === "accepted" ? t("fileReview_accepted") : t("fileReview_rejected")}
              </span>
              <button
                class="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                onclick={() => setDecision(selectedPath, "pending")}
              >
                ↺
              </button>
            {/if}
          </div>
        </div>

        <div class="flex-1 overflow-auto bg-[#1a1b26] p-0">
          {#if diffLoading}
            <div class="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
              {t("fileReview_loading")}
            </div>
          {:else if !diffContent}
            <div class="flex items-center justify-center h-32 text-xs text-muted-foreground/50">
              {t("fileReview_noDiff")}
            </div>
          {:else}
            <pre class="text-xs font-mono leading-relaxed m-0">{#each diffLines as line, li}<div
                  class="px-4 py-0 {line.startsWith('+') && !line.startsWith('+++')
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : line.startsWith('-') && !line.startsWith('---')
                      ? 'bg-red-500/10 text-red-400'
                      : line.startsWith('@@')
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-[#c0caf5]/70'}"
                ><span class="inline-block w-8 text-right mr-3 text-muted-foreground/30 select-none"
                  >{li + 1}</span
                >{line}</div>{/each}</pre>
          {/if}
        </div>
      {:else}
        <div class="flex items-center justify-center h-full text-xs text-muted-foreground/50">
          {t("fileReview_noFiles")}
        </div>
      {/if}
    </div>
  </div>
</Modal>
