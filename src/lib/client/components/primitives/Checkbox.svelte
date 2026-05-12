<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    name,
    value,
    checked = $bindable(false),
    disabled = false,
    required = false,
    compact = false,
    children
  }: {
    label?: string;
    name: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
    required?: boolean;
    compact?: boolean;
    children?: Snippet;
  } = $props();
</script>

<label class="check-field" class:compact>
  <input {name} {value} type="checkbox" bind:checked {disabled} {required} />
  <span class="check-label">
    {#if children}
      {@render children()}
    {:else if label}
      {label}
    {/if}
  </span>
</label>

<style lang="scss">
  .check-field {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 14px;
    line-height: 1.45;
    color: var(--color-brand);
    cursor: pointer;

    input {
      flex: none;
      margin-top: 3px;
    }

    a {
      color: var(--color-link);
      text-decoration: underline;
    }
  }

  .check-field.compact {
    font-size: 13px;

    input {
      margin-top: 2px;
    }
  }

  .check-label {
    flex: 1;
  }
</style>
