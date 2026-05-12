<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  let {
    value = 0,
    label,
    showValue = false,
    variant = "default",
    size = "md",
    ...rest
  }: {
    value?: number;
    label?: string;
    showValue?: boolean;
    variant?: "default" | "success" | "warning" | "danger";
    size?: "sm" | "md";
  } & HTMLAttributes<HTMLDivElement> = $props();

  const pct = $derived(Math.min(Math.max(value, 0), 100));
</script>

<div class="progress-wrap" {...rest}>
  {#if label || showValue}
    <div class="progress-header">
      {#if label}
        <span class="progress-label">{label}</span>
      {/if}
      {#if showValue}
        <span class="progress-value">{Math.round(pct)}%</span>
      {/if}
    </div>
  {/if}
  <div class="progress-track progress--{size}" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100">
    <div class="progress-fill progress--{variant}" style="width: {pct}%"></div>
  </div>
</div>

<style lang="scss">
  .progress-wrap {
    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;

      .progress-label {
        font-size: var(--font-size-small, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        color: var(--color-text, #171717);
      }

      .progress-value {
        font-size: var(--font-size-small, 0.875rem);
        font-weight: var(--font-weight-semibold, 650);
        color: var(--color-muted, #686c6b);
      }
    }
  }

  .progress-track {
    height: 6px;
    background: var(--color-line, #dedfde);
    border-radius: 999px;
    overflow: hidden;

    &.progress--sm {
      height: 3px;
    }

    &.progress--md {
      height: 6px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 999px;
      transition: width 0.4s ease;

      &.progress--default {
        background: var(--color-link, #0d6fd6);
      }

      &.progress--success {
        background: var(--color-success, #16a34a);
      }

      &.progress--warning {
        background: var(--color-warning, #f59e0b);
      }

      &.progress--danger {
        background: var(--color-danger, #8a1f1f);
      }
    }
  }
</style>
