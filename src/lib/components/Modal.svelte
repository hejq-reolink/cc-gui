<script lang="ts">
  let {
    open = $bindable(false),
    title = "",
    closeable = true,
    maxWidth = "max-w-lg",
    children,
  }: {
    open?: boolean;
    title?: string;
    closeable?: boolean;
    maxWidth?: string;
    children?: import("svelte").Snippet;
  } = $props();

  let dialogEl: HTMLDivElement | undefined = $state();
  let closing = $state(false);
  let visible = $state(false);

  $effect(() => {
    if (open) {
      visible = true;
      closing = false;
      requestAnimationFrame(() => dialogEl?.focus());
    } else if (visible) {
      closing = true;
    }
  });

  function handleAnimationEnd() {
    if (closing) {
      visible = false;
      closing = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (!closeable) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      open = false;
    }
  }

  function handleBackdropClick() {
    if (!closeable) return;
    open = false;
  }
</script>

{#if visible}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    bind:this={dialogEl}
    onkeydown={handleKeydown}
  >
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black/40 backdrop-blur-md {closing ? 'animate-backdrop-out' : 'animate-backdrop-in'}"
      onclick={handleBackdropClick}
      role="presentation"
    ></div>

    <!-- Content -->
    <div
      class="relative z-50 w-full {maxWidth} rounded-2xl border bg-background p-6 shadow-apple-lg {closing ? 'animate-slide-down' : 'animate-slide-up'}"
      onanimationend={handleAnimationEnd}
    >
      {#if title}
        <h2 class="mb-4 text-lg font-semibold">{title}</h2>
      {/if}
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}
