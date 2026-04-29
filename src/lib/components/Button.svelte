<script lang="ts">
  type Variant = "default" | "destructive" | "outline" | "secondary" | "ghost";
  type Size = "sm" | "default" | "lg" | "icon";

  let {
    variant = "default",
    size = "default",
    disabled = false,
    loading = false,
    class: className = "",
    onclick,
    children,
  }: {
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    loading?: boolean;
    class?: string;
    onclick?: (e: MouseEvent) => void;
    children?: import("svelte").Snippet;
  } = $props();

  const base =
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

  const variants: Record<Variant, string> = {
    default: "bg-primary text-primary-foreground shadow-apple-sm hover:bg-primary/90 hover:shadow-apple",
    destructive: "bg-destructive text-destructive-foreground shadow-apple-sm hover:bg-destructive/90 hover:shadow-apple",
    outline: "border border-input bg-background shadow-apple-sm hover:bg-accent hover:text-accent-foreground hover:shadow-apple",
    secondary: "bg-secondary text-secondary-foreground shadow-apple-sm hover:bg-secondary/80 hover:shadow-apple",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  };

  const sizes: Record<Size, string> = {
    sm: "h-8 rounded-md px-3 text-xs",
    default: "h-9 px-4 py-2",
    lg: "h-10 rounded-lg px-8",
    icon: "h-9 w-9 rounded-lg",
  };
</script>

<button
  class="{base} {variants[variant]} {sizes[size]} {className}"
  disabled={disabled || loading}
  {onclick}
>
  {#if loading}
    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
      ></circle>
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  {:else if children}
    {@render children()}
  {/if}
</button>
