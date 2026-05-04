<script lang="ts">
  let {
    label,
    name,
    value,
    checked = false,
    disabled = false,
  }: {
    label?: string;
    name: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean;
  } = $props();
</script>

<label class="check-field">
  <input {name} {value} type="checkbox" bind:checked {disabled} />
  {#if label}
    <span>{label}</span>
  {/if}
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
  }
</style>
