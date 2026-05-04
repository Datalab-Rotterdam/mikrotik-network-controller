<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    icon,
    title,
    description,
    children,
  }: {
    icon: string;
    title: string;
    description: string;
    children?: Snippet;
  } = $props();
</script>

<div class="empty-state">
  <div class="empty-state-content">
    <div class="empty-state-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="48" height="48">
        <path fill="currentColor" d={icon} />
      </svg>
    </div>
    <strong class="empty-state-title">{title}</strong>
    <p class="empty-state-description">{description}</p>
    {#if children}
      <div class="empty-state-action">
        {@render children()}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .empty-state {
    display: grid;
    place-items: center;
    min-height: 360px;
  }

  .empty-state-content {
    display: grid;
    justify-items: center;
    text-align: center;
    color: var(--color-muted, #686c6b);
    gap: 8px;
    max-width: 420px;
    padding: 0 var(--space-md, 1rem);
  }

  .empty-state-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 44px;
    margin-bottom: 8px;
    color: var(--color-brand-light, #c8c8c7);
  }

  .empty-state-title {
    color: var(--color-text, #171717);
    font-size: var(--font-size-body, 1rem);
  }

  .empty-state-description {
    margin: 0;
    line-height: 1.5;
    font-size: var(--font-size-small, 0.875rem);
  }

  .empty-state-action {
    margin-top: var(--space-sm, 0.75rem);
  }
</style>
