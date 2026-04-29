<script lang="ts">
  let {
    value = $bindable(""),
    placeholder = "",
    type = "text",
    disabled = false,
    class: className = "",
    oninput,
    onblur,
    onpaste,
  }: {
    value?: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    class?: string;
    oninput?: (e: Event) => void;
    onblur?: (e: FocusEvent) => void;
    onpaste?: (e: ClipboardEvent) => void;
  } = $props();
</script>

<input
  {type}
  {placeholder}
  {disabled}
  bind:value
  {oninput}
  {onblur}
  {onpaste}
  class="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-apple-sm transition-all duration-200 ease-spring placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 {className}"
/>
