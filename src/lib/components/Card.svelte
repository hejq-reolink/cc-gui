<script lang="ts">
  type Variant = "default" | "subtle" | "highlighted";

  let {
    variant = "default",
    class: className = "",
    children,
  }: {
    variant?: Variant;
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();

  const variants: Record<Variant, string> = {
    default: "rounded-xl glass-card hover:shadow-apple-md transition-all duration-200 ease-spring",
    subtle: "rounded-xl border border-transparent bg-muted/40 backdrop-blur-sm hover:bg-muted/60 transition-all duration-200 ease-spring",
    highlighted:
      "rounded-xl border-2 border-primary/20 glass-card hover:shadow-apple-md hover:border-primary/40 transition-all duration-200 ease-spring",
  };
</script>

<div class="{variants[variant]} {className}">
  {#if children}
    {@render children()}
  {/if}
</div>
