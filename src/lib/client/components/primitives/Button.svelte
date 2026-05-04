<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";

  let {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    type = "button",
    fullWidth = false,
    children,
    ...rest
  }: {
    variant?: "primary" | "secondary" | "danger" | "warning" | "ghost" | "icon";
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    disabled?: boolean;
    type?: HTMLButtonAttributes["type"];
    fullWidth?: boolean;
    children?: import("svelte").Snippet;
  } & HTMLButtonAttributes = $props();

  let buttonClass = $derived(
    `btn btn--${variant} ${size !== "md" ? `btn--${size}` : ""}`,
  );
</script>

<button
  class={buttonClass}
  class:full-width={fullWidth}
  {type}
  {disabled}
  aria-busy={loading}
  {...rest}
>
  {#if loading}
    <span class="spinner" aria-hidden="true"></span>
  {:else if children}
    {@render children()}
  {/if}
</button>

<style lang="scss">
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    padding: 0 16px;
    min-height: 42px;
    font-weight: var(--font-weight-bold);
    cursor: pointer;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &--primary {
      border-color: var(--color-brand);
      color: var(--color-surface);
      background: var(--color-brand);
    }

    &--secondary {
      border-color: var(--color-brand-light);
      color: var(--color-brand);
      background: var(--color-surface);
    }

    &--danger {
      border-color: var(--color-danger);
      color: var(--color-surface);
      background: var(--color-danger);
    }

    &--warning {
      border-color: var(--color-warning);
      color: var(--color-surface);
      background: var(--color-warning);
    }

    &--ghost {
      border-color: transparent;
      background: transparent;
      color: var(--color-text);
    }

    &--sm {
      min-height: 32px;
      padding: 0 12px;
      font-size: var(--font-size-small);
    }

    &--lg {
      min-height: 48px;
      padding: 0 24px;
      font-size: var(--font-size-h3);
    }
  }

  .full-width {
    width: 100%;
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
