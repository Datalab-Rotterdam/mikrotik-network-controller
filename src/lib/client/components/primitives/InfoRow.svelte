<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    value,
    mono = false,
    children,
  }: {
    label?: string;
    value?: string | number;
    mono?: boolean;
    children?: Snippet;
  } = $props();
</script>

{#if children}
  {@render children()}
{:else}
  <div class="info-row">
    {#if label}
      <span class="info-label">{label}</span>
    {/if}
    <span class="info-value" class:mono>
      {String(value ?? "—")}
    </span>
  </div>
{/if}

<style lang="scss">
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--color-line, #dedfde);

    .info-label {
      font-size: var(--font-size-small, 0.875rem);
      color: var(--color-muted, #686c6b);
      font-weight: var(--font-weight-medium, 500);
      flex-shrink: 0;
    }

    .info-value {
      font-size: var(--font-size-small, 0.875rem);
      color: var(--color-text, #171717);
      font-weight: var(--font-weight-semibold, 650);
      text-align: right;
      word-break: break-all;

      &.mono {
        font-family: var(--font-mono, "JetBrains Mono", monospace);
      }
    }
  }
</style>
