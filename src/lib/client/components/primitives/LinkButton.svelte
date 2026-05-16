<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    href,
    variant = 'secondary',
    size = 'md',
    children,
  }: {
    href: string;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md';
    children?: Snippet;
  } = $props();
</script>

<a {href} class="link-btn link-btn--{variant} link-btn--{size}">
  {#if children}
    {@render children()}
  {/if}
</a>

<style lang="scss">
  .link-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    font-weight: 650;
    border: 1px solid transparent;
    border-radius: var(--radius-md, 6px);
    transition: background 0.1s, border-color 0.1s;
    cursor: pointer;

    &--sm {
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
    }

    &--md {
      height: 34px;
      padding: 0 14px;
      font-size: 13px;
    }

    &--primary {
      background: var(--color-brand);
      color: #fff;
      border-color: var(--color-brand);

      &:hover {
        background: color-mix(in srgb, var(--color-brand) 85%, #000);
      }
    }

    &--secondary {
      background: transparent;
      color: var(--color-brand);
      border-color: var(--color-brand);

      &:hover {
        background: color-mix(in srgb, var(--color-brand) 8%, transparent);
      }
    }

    &--ghost {
      background: transparent;
      color: var(--color-link);
      border-color: transparent;

      &:hover {
        text-decoration: underline;
      }
    }
  }
</style>
