<script lang="ts">
  import { formatTokenCount } from "$lib/utils/format";
  import { t } from "$lib/i18n/index.svelte";

  let {
    usedTokens = 0,
    contextWindow = 0,
    warningLevel = "none",
    compactCount = 0,
    estimatedTurnsLeft = 0,
  }: {
    usedTokens: number;
    contextWindow: number;
    warningLevel: "none" | "moderate" | "high" | "critical";
    compactCount: number;
    estimatedTurnsLeft: number;
  } = $props();

  let pct = $derived(contextWindow > 0 ? Math.min(100, (usedTokens / contextWindow) * 100) : 0);

  let barColor = $derived(
    warningLevel === "critical"
      ? "bg-red-500"
      : warningLevel === "high"
        ? "bg-orange-500"
        : warningLevel === "moderate"
          ? "bg-amber-500"
          : "bg-emerald-500",
  );

  let textColor = $derived(
    warningLevel === "critical"
      ? "text-red-500"
      : warningLevel === "high"
        ? "text-orange-500"
        : warningLevel === "moderate"
          ? "text-amber-500"
          : "text-muted-foreground",
  );
</script>

{#if contextWindow > 0}
  <div class="space-y-1">
    <div class="flex items-center justify-between text-[11px]">
      <span class="text-muted-foreground font-medium">{t("contextPanel_contextGauge")}</span>
      <span class="{textColor} font-mono tabular-nums">
        {formatTokenCount(usedTokens)} / {formatTokenCount(contextWindow)}
        <span class="text-[10px]">({Math.round(pct)}%)</span>
      </span>
    </div>

    <div class="h-2.5 rounded-full bg-muted overflow-hidden">
      <div
        class="h-full rounded-full transition-all duration-300 {barColor}"
        style="width: {pct}%"
      ></div>
    </div>

    <div class="flex items-center justify-between text-[10px] text-muted-foreground">
      {#if estimatedTurnsLeft > 0}
        <span>{t("contextPanel_remainingEstimate", { turns: String(estimatedTurnsLeft) })}</span>
      {:else}
        <span></span>
      {/if}
      {#if compactCount > 0}
        <span>{t("contextPanel_compacted", { count: String(compactCount) })}</span>
      {/if}
    </div>
  </div>
{/if}
