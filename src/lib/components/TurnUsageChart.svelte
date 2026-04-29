<script lang="ts">
  import type { TurnUsage, CompactEvent } from "$lib/stores/types";
  import { formatTokenCount, formatCost } from "$lib/utils/format";
  import { t } from "$lib/i18n/index.svelte";

  let {
    turnUsages = [],
    contextWindow = 0,
    compactEvents = [],
    onScrollToTurn,
  }: {
    turnUsages: TurnUsage[];
    contextWindow: number;
    compactEvents: CompactEvent[];
    onScrollToTurn?: (turnIndex: number) => void;
  } = $props();

  const BAR_WIDTH = 18;
  const BAR_GAP = 4;
  const CHART_HEIGHT = 80;
  const PADDING_TOP = 4;
  const PADDING_BOTTOM = 16;

  let maxTokens = $derived(
    Math.max(
      1,
      ...turnUsages.map(
        (tu) => tu.inputTokens + tu.outputTokens + tu.cacheReadTokens + tu.cacheWriteTokens,
      ),
    ),
  );

  let chartWidth = $derived(
    Math.max(120, turnUsages.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP),
  );

  let drawableHeight = $derived(CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

  let compactTurnSet = $derived(new Set(compactEvents.map((e) => e.turnIndex)));

  interface BarSegment {
    y: number;
    height: number;
    color: string;
    label: string;
    tokens: number;
  }

  interface BarData {
    x: number;
    turnIndex: number;
    segments: BarSegment[];
    totalTokens: number;
    cost: number;
    hasCompact: boolean;
  }

  let bars = $derived.by((): BarData[] => {
    return turnUsages.map((tu, i) => {
      const x = BAR_GAP + i * (BAR_WIDTH + BAR_GAP);
      const total = tu.inputTokens + tu.outputTokens + tu.cacheReadTokens + tu.cacheWriteTokens;
      const scale = drawableHeight / maxTokens;

      const parts: { tokens: number; color: string; label: string }[] = [
        { tokens: tu.cacheWriteTokens, color: "#06b6d4", label: "Cache Write" },
        { tokens: tu.cacheReadTokens, color: "#a855f7", label: "Cache Read" },
        { tokens: tu.outputTokens, color: "#22c55e", label: "Output" },
        { tokens: tu.inputTokens, color: "#3b82f6", label: "Input" },
      ];

      let currentY = CHART_HEIGHT - PADDING_BOTTOM;
      const segments: BarSegment[] = [];

      for (const p of parts) {
        if (p.tokens <= 0) continue;
        const h = Math.max(1, p.tokens * scale);
        currentY -= h;
        segments.push({ y: currentY, height: h, color: p.color, label: p.label, tokens: p.tokens });
      }

      return {
        x,
        turnIndex: tu.turnIndex,
        segments,
        totalTokens: total,
        cost: tu.cost,
        hasCompact: compactTurnSet.has(tu.turnIndex),
      };
    });
  });

  let hoveredBar = $state<BarData | null>(null);
  let tooltipX = $state(0);
  let tooltipY = $state(0);

  function handleBarEnter(bar: BarData, event: MouseEvent) {
    hoveredBar = bar;
    tooltipX = event.clientX;
    tooltipY = event.clientY;
  }

  function handleBarLeave() {
    hoveredBar = null;
  }

  function handleBarClick(bar: BarData) {
    onScrollToTurn?.(bar.turnIndex);
  }

  function getTurnCost(tu: TurnUsage): number {
    const idx = turnUsages.indexOf(tu);
    if (idx <= 0) return tu.cost;
    return Math.max(0, tu.cost - turnUsages[idx - 1].cost);
  }
</script>

{#if turnUsages.length > 1}
  <div class="space-y-1">
    <div class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
      {t("contextPanel_usageChart")}
    </div>

    <div class="overflow-x-auto rounded bg-muted/30">
      <svg
        width={chartWidth}
        height={CHART_HEIGHT}
        class="block"
        role="img"
        aria-label="Turn usage chart"
      >
        {#each bars as bar (bar.turnIndex)}
          {#if bar.hasCompact}
            <line
              x1={bar.x - BAR_GAP / 2}
              y1={PADDING_TOP}
              x2={bar.x - BAR_GAP / 2}
              y2={CHART_HEIGHT - PADDING_BOTTOM}
              stroke="currentColor"
              stroke-dasharray="2,2"
              class="text-amber-500/50"
              stroke-width="1"
            />
          {/if}

          {#each bar.segments as seg}
            <rect
              x={bar.x}
              y={seg.y}
              width={BAR_WIDTH}
              height={seg.height}
              fill={seg.color}
              rx="1"
              class="cursor-pointer hover:opacity-80 transition-opacity"
              onmouseenter={(e) => handleBarEnter(bar, e)}
              onmouseleave={handleBarLeave}
              onclick={() => handleBarClick(bar)}
            />
          {/each}

          <text
            x={bar.x + BAR_WIDTH / 2}
            y={CHART_HEIGHT - 3}
            text-anchor="middle"
            class="fill-muted-foreground text-[8px]"
          >
            {bar.turnIndex}
          </text>
        {/each}
      </svg>
    </div>

    <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-muted-foreground">
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-sm" style="background:#3b82f6"></span> Input
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-sm" style="background:#22c55e"></span> Output
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-sm" style="background:#a855f7"></span> Cache R
      </span>
      <span class="flex items-center gap-1">
        <span class="inline-block w-2 h-2 rounded-sm" style="background:#06b6d4"></span> Cache W
      </span>
    </div>
  </div>
{/if}

{#if hoveredBar}
  <div
    class="fixed z-50 px-2 py-1.5 rounded shadow-lg bg-popover border border-border text-[10px] pointer-events-none"
    style="left: {tooltipX + 12}px; top: {tooltipY - 40}px"
  >
    <div class="font-medium text-foreground">
      Turn {hoveredBar.turnIndex}
    </div>
    <div class="text-muted-foreground space-y-0.5 mt-0.5">
      <div>{formatTokenCount(hoveredBar.totalTokens)} tokens</div>
      <div>{formatCost(getTurnCost(turnUsages[bars.indexOf(hoveredBar)]))}</div>
      {#each hoveredBar.segments as seg}
        <div class="flex items-center gap-1">
          <span class="inline-block w-1.5 h-1.5 rounded-sm" style="background:{seg.color}"></span>
          {seg.label}: {formatTokenCount(seg.tokens)}
        </div>
      {/each}
    </div>
  </div>
{/if}
