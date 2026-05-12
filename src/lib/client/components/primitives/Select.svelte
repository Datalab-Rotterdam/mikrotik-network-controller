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
    compact = false,
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
    compact?: boolean;
  } & HTMLSelectAttributes = $props();
</script>

<label class="field" class:compact class:has-error={Boolean(error)}>
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
    gap: 7px;
    color: #282a29;
    font-size: 14px;
    font-weight: 650;

    select {
      width: 100%;
      border: 1px solid var(--color-brand-light);
      border-radius: 6px;
      padding: 11px 12px;
      color: var(--color-brand);
      background: var(--color-surface);
    }

    select:focus {
      border-color: var(--color-brand);
      outline: 3px solid rgba(14, 14, 16, 0.14);
    }
	}

	.field.compact {
		gap: 4px;
		color: #72777a;
		font-size: 12px;
		font-weight: 500;

		select {
			min-height: 31px;
			border-color: #f0f1f3;
			border-radius: 3px;
			padding: 5px 10px;
			background: #f4f5f6;
		}
	}
  </style>
