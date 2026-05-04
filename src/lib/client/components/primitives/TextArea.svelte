<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  let {
    label,
    name,
    value = "",
    placeholder,
    required = false,
    rows = 4,
    resize = true,
    error,
    ...rest
  }: {
    label?: string;
    name: string;
    value?: string;
    placeholder?: string;
    required?: boolean;
    rows?: number;
    resize?: boolean;
    error?: string;
  } = $props();
</script>

<label class="field" class:has-error={Boolean(error)}>
  {#if label}
    <span>{label}</span>
  {/if}
  <textarea
    {name}
    {value}
    {placeholder}
    {required}
    {rows}
    class:no-resize={!resize}
    {...rest}
  ></textarea>
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

  .field textarea {
    width: 100%;
    border: 1px solid var(--color-brand-light);
    border-radius: 6px;
    padding: 10px 12px;
    color: var(--color-brand);
    background: var(--color-surface);
    resize: vertical;
    min-height: 60px;
  }

  .field textarea:focus {
    border-color: var(--color-brand);
    outline: 3px solid rgba(14, 14, 16, 0.14);
  }

  .field textarea.no-resize {
    resize: none;
  }

  .field.has-error textarea {
    border-color: var(--color-danger);
  }

  .error-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-danger);
  }
</style>
