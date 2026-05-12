<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  let {
    checked = $bindable(false),
    label,
    name,
    disabled = false,
    id,
    ...rest
  }: {
    checked?: boolean;
    label?: string;
    name?: string;
    disabled?: boolean;
    id?: string;
  } & HTMLInputAttributes = $props();

  const switchId = $derived(id ?? name ?? `switch-${Math.random().toString(36).slice(2)}`);

  function toggle() {
    if (!disabled) {
      checked = !checked;
    }
  }
</script>

<label class="switch" class:disabled>
  <input
    type="checkbox"
    {name}
    {checked}
    {disabled}
    id={switchId}
    class="switch-input"
    {...rest}
  />
  <span class="switch-track" onclick={toggle} role="switch" aria-checked={checked} aria-labelledby={label ? switchId + "-label" : undefined} tabindex="0" onkeydown={(e) => e.key === 'Enter' && toggle()}>
    <span class="switch-knob"></span>
  </span>
  {#if label}
    <span id={switchId + "-label"} class="switch-label">{label}</span>
  {/if}
</label>

<style lang="scss">
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .switch-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch-track {
      position: relative;
      width: 40px;
      height: 22px;
      border-radius: 999px;
      background: var(--color-line, #dedfde);
      transition: background 0.15s ease;
      flex-shrink: 0;

      .switch-knob {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--color-surface, #fff);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        transition: transform 0.15s ease;
      }
    }

    input:checked ~ .switch-track {
      background: var(--color-link, #0d6fd6);

      .switch-knob {
        transform: translateX(18px);
      }
    }

    input:focus-visible ~ .switch-track {
      outline: 2px solid rgba(13, 111, 214, 0.28);
      outline-offset: 2px;
    }

    .switch-label {
      font-size: var(--font-size-small, 0.875rem);
      color: var(--color-text, #171717);
      font-weight: var(--font-weight-medium, 500);
    }
  }
</style>
