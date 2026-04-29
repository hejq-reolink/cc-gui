<script lang="ts">
  let {
    value = $bindable(""),
    placeholder = "",
    rows = 3,
    disabled = false,
    class: className = "",
    onkeydown,
  }: {
    value?: string;
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    class?: string;
    onkeydown?: (e: KeyboardEvent) => void;
  } = $props();
</script>

<textarea
  {placeholder}
  {rows}
  {disabled}
  bind:value
  {onkeydown}
  class="flex min-h-[60px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-apple-sm transition-all duration-200 ease-spring placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 resize-none {className}"
></textarea>
