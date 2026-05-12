<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    title,
    subtitle,
    children,
    actions,
    ...rest
  }: {
    title?: string;
    subtitle?: string;
    children?: Snippet;
    actions?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<header class="page-header" {...rest}>
  <div class="page-content">
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
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  .page-header .page-content {
    flex: 1 1 auto;
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .page-header h1 {
    margin: 0;
    color: var(--color-text);
    font-size: 20px;
    font-weight: 650;
  }

  .page-header p {
    margin: 0;
    color: var(--color-muted);
    font-size: 13px;
    line-height: 1.4;
  }

  .header-actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
