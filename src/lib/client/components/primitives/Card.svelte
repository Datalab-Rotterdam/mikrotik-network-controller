<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    description,
    collapsible = false,
    children,
    actions,
  }: {
    title?: string;
    description?: string;
    collapsible?: boolean;
    children?: Snippet;
    actions?: Snippet;
  } = $props();

  let isOpen = $state(true);

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="card">
  {#if title || description || actions}
    <div class="card-head">
      <div class="card-title-block">
        {#if title}
          <h2 class="card-title">{title}</h2>
        {/if}
        {#if description}
          <p class="card-description">{description}</p>
        {/if}
      </div>
      <div class="card-actions">
        {#if actions}
          {@render actions()}
        {/if}
        {#if collapsible}
          <button
            class="collapse-btn"
            type="button"
            aria-expanded={isOpen}
            onclick={toggle}
          >
            <span class="bi bi-chevron-down">{" "}</span>
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if !collapsible || isOpen}
    <div class="card-body">
      {#if children}
        {@render children()}
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .card {
    border-radius: var(--radius-md, 6px);
    padding: var(--space-md, 1rem);
    background: var(--color-surface, #fff);
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: var(--space-sm, 0.75rem);

    .card-title-block {
      flex: 1 1 auto;
      min-width: 0;
    }

    .card-actions {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .card-title {
    margin: 0;
    font-size: var(--font-size-h3, 1.125rem);
    font-weight: var(--font-weight-semibold, 650);
  }

  .card-description {
    margin: 4px 0 0;
    font-size: var(--font-size-small, 0.875rem);
    color: var(--color-muted, #686c6b);
  }

  .collapse-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-muted);
    font-size: 16px;
    padding: 4px;
  }

  .card-body {
    display: grid;
    gap: var(--space-sm, 0.75rem);
  }
</style>
