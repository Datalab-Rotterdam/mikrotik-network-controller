<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    children,
    ...rest
  }: {
    children?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<div class="section-label" {...rest}>
  {#if children}
    {@render children()}
  {/if}
</div>

<style lang="scss">
  .section-label {
    font-size: 10px;
    font-weight: var(--font-weight-bold, 750);
    letter-spacing: 0.08em;
    color: var(--color-muted, #686c6b);
    text-transform: uppercase;
    padding: 16px 0 6px;
    margin-bottom: 2px;
  }
</style>
