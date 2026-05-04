<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    subtitle,
    children,
    actions,
  }: {
    title?: string;
    subtitle?: string;
    children?: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<header class="page-header">
  <div class="content">
    {#if title}
      <h1>{title}</h1>
    {/if}
    {#if subtitle}
      <p>{subtitle}</p>
    {/if}
    {#if children}
      {@render children()}
    {/if}
  </div>
  {#if actions}
    <div class="header-actions">
      {@render actions()}
    </div>
  {/if}
</header>

<style lang="scss">
  .page-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: var(--space-md, 1rem);

    .content {
      flex: 1 1 auto;
      min-width: 0;
      display: grid;
      gap: 4px;
    }

    .header-actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
</style>
