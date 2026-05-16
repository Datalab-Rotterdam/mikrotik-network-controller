<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    variant = 'default',
    flush = false,
    actions,
    children,
  }: {
    title?: string;
    variant?: 'default' | 'danger';
    flush?: boolean;
    actions?: Snippet;
    children?: Snippet;
  } = $props();
</script>

<div class="detail-card detail-card--{variant}">
  {#if title || actions}
    <div class="detail-card__head">
      {#if title}
        <span class="detail-card__title">{title}</span>
      {/if}
      {#if actions}
        <div class="detail-card__actions">
          {@render actions()}
        </div>
      {/if}
    </div>
  {/if}
  <div class="detail-card__body" class:detail-card__body--flush={flush}>
    {#if children}
      {@render children()}
    {/if}
  </div>
</div>

<style lang="scss">
  .detail-card {
    border-radius: var(--radius-md, 6px);
    background: var(--color-surface);
    overflow: hidden;

    &--default {
      border: 1px solid var(--color-border, var(--color-line, #dedfde));
    }

    &--danger {
      border: 1px solid var(--color-danger-light, #efb8b8);
      background: color-mix(in srgb, var(--color-danger, #8a1f1f) 4%, var(--color-surface));
    }

    &__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 16px;
      border-bottom: 1px solid var(--color-border, var(--color-line, #dedfde));
    }

    &__title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text);
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--color-muted);
    }

    &__body {
      padding: 16px;

      &--flush {
        padding: 0;
      }
    }
  }
</style>
