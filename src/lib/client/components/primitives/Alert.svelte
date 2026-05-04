<script lang="ts">
  let {
    variant = "info",
    dismissable = false,
    onDismiss,
    children,
  }: {
    variant?: "info" | "success" | "warning" | "error";
    dismissable?: boolean;
    onDismiss?: () => void;
    children?: import("svelte").Snippet;
  } = $props();

  function handleDismiss() {
    if (onDismiss) onDismiss();
  }
</script>

<div class="alert alert--{variant}" role="alert">
  {#if children}
    {@render children()}
  {/if}
  {#if dismissable}
    <button
      class="dismiss"
      type="button"
      aria-label="Dismiss"
      onclick={handleDismiss}
    >
      <span class="bi bi-x-lg"></span>
    </button>
  {/if}
</div>

<style lang="scss">
  .alert {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    position: relative;
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-size: var(--font-size-small);
    line-height: 1.5;

    &--info {
      border: 1px solid var(--color-info-light);
      color: var(--color-info);
      background: #eff6ff;
    }

    &--success {
      border: 1px solid var(--color-success-light);
      color: var(--color-success);
      background: #f0fdf4;
    }

    &--warning {
      border: 1px solid var(--color-warning-light);
      color: var(--color-warning);
      background: #fffbeb;
    }

    &--error {
      border: 1px solid var(--color-danger-light);
      color: var(--color-danger);
      background: #fde8e8;
    }
  }

  .dismiss {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin: -4px -8px 0 0;
    padding: 4px 8px;
    background: none;
    border: none;
    cursor: pointer;
    opacity: 0.6;
    color: inherit;
    font-size: 14px;

    &:hover {
      opacity: 1;
    }
  }
</style>
