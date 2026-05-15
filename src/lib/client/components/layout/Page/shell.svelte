<script lang="ts">

    const {children} = $props();

</script>

<div class="shell">
    {@render children?.()}
</div>

<style lang="scss">
  .shell {
    flex: 1 1 auto;
    min-height: 0;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-surface);
  }
</style>
