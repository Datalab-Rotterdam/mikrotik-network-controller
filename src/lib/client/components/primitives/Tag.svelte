<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    label,
    variant = "default",
    size = "md",
    children,
    ...rest
  }: {
    label: string;
    variant?: "default" | "success" | "warning" | "danger" | "info";
    size?: "sm" | "md";
    children?: Snippet;
  } & HTMLAttributes<HTMLElement> = $props();
</script>

<span class="tag tag--{variant} tag--{size}" {...rest}>
  {#if children}
    {@render children()}
  {:else}
    {label}
  {/if}
</span>

<style lang="scss">
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: 999px;
    font-weight: var(--font-weight-semibold, 650);
    white-space: nowrap;
    line-height: 1.4;

    &--sm {
      font-size: 10px;
    }

    &--md {
      font-size: 11px;
    }

    &--default {
      background: var(--color-line, #dedfde);
      color: var(--color-text, #171717);
      border: 1px solid var(--color-line, #dedfde);
    }

    &--success {
      background: var(--color-success-light, #bbf7d0);
      color: var(--color-success, #16a34a);
      border: 1px solid var(--color-success-light, #bbf7d0);
    }

    &--warning {
      background: var(--color-warning-light, #fef3c7);
      color: var(--color-warning, #f59e0b);
      border: 1px solid var(--color-warning-light, #fef3c7);
    }

    &--danger {
      background: var(--color-danger-light, #efb8b8);
      color: var(--color-danger, #8a1f1f);
      border: 1px solid var(--color-danger-light, #efb8b8);
    }

    &--info {
      background: var(--color-info-light, #bfdbfe);
      color: var(--color-info, #0d6fd6);
      border: 1px solid var(--color-info-light, #bfdbfe);
    }
  }
</style>
