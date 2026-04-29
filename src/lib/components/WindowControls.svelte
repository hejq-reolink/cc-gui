<script lang="ts">
  import { onMount } from "svelte";

  type TauriWindow = Awaited<
    ReturnType<typeof import("@tauri-apps/api/window").getCurrentWindow>
  >;

  let win: TauriWindow | null = $state(null);
  let maximized = $state(false);

  onMount(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const w = getCurrentWindow();
        win = w;
        maximized = await w.isMaximized();
        unlisten = await w.onResized(async () => {
          maximized = await w.isMaximized();
        });
      } catch {
        // not in Tauri env
      }
    })();

    return () => {
      unlisten?.();
    };
  });

  export function startDrag() {
    win?.startDragging();
  }

  export function dblToggleMaximize() {
    win?.toggleMaximize();
  }
</script>

<div class="window-controls">
  <button
    class="wc-btn"
    onclick={() => win?.minimize()}
    title="Minimize"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6h7" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
    </svg>
  </button>
  <button
    class="wc-btn"
    onclick={() => win?.toggleMaximize()}
    title={maximized ? "Restore" : "Maximize"}
  >
    {#if maximized}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="3" y="4" width="5.5" height="5.5" rx="0.5" stroke="currentColor" stroke-width="1" />
        <path d="M4.5 4V3a.5.5 0 0 1 .5-.5H9a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5H8.5" stroke="currentColor" stroke-width="1" />
      </svg>
    {:else}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2.5" y="2.5" width="7" height="7" rx="0.5" stroke="currentColor" stroke-width="1" />
      </svg>
    {/if}
  </button>
  <button
    class="wc-btn wc-close"
    onclick={() => win?.close()}
    title="Close"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" />
    </svg>
  </button>
</div>

<style>
  .window-controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .wc-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 46px;
    height: 32px;
    color: hsl(var(--foreground) / 0.7);
    transition: background 0.1s, color 0.1s;
    border: none;
    background: transparent;
    cursor: pointer;
  }

  .wc-btn:hover {
    background: hsl(var(--foreground) / 0.08);
    color: hsl(var(--foreground));
  }

  .wc-btn:active {
    background: hsl(var(--foreground) / 0.12);
  }

  .wc-close:hover {
    background: #c42b1c;
    color: #fff;
  }

  .wc-close:active {
    background: #b4271a;
    color: #fff;
  }
</style>
