<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    children,
    ...rest
  }: {
    children: Snippet;
  } & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class="page-shell" {...rest}>
  {@render children()}
</div>

<style lang="scss">
  .page-shell {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    flex: 1 1 auto;
    min-height: 0;
  }
</style>