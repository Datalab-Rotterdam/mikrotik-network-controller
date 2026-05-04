<script lang="ts">
  import type { HTMLSelectAttributes } from "svelte/elements";

  type Option = { value: string; label: string };

  let {
    label,
    name,
    options = [],
    value = "",
    placeholder,
    required = false,
    error,
    ...rest
  }: {
    label?: string;
    name: string;
    options?: Option[];
    value?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
  } & HTMLSelectAttributes = $props();
</script>

<label class="field" class:has-error={Boolean(error)}>
  {#if label}
    <span>{label}</span>
  {/if}
  <select {name} {value} {required} {...rest}>
    {#if placeholder}
      <option value="" disabled>{placeholder}</option>
    {/if}
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  {#if error}
    <span class="error-text">{error}</span>
  {/if}
</label>

<style lang="scss">
  .field {
    display: grid;
    gap: 6px;
    color: #282a29;
    font-size: 14px;
    font-weight: 650;
  }

  .field select {
    width: 100%;
    border: 1px solid var(--color-brand-light);
    border-radius: 6px;
    padding: 10px 12px;
    color: var(--color-brand);
    background: var(--color-surface);
  }

  .field select:focus {
    border-color: var(--color-brand);
    outline: 3px solid rgba(14, 14, 16, 0.14);
  }

  .field.has-error select {
    border-color: var(--color-danger);
  }

  .error-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-danger);
  }
</style>
