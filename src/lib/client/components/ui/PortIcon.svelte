<script lang="ts">
  let {
    running = false,
    disabled = false,
    size = "sm",
  }: {
    running?: boolean;
    disabled?: boolean;
    size?: "sm" | "md";
  } = $props();

  const state = $derived(disabled ? "disabled" : running ? "running" : "inactive");
</script>

<span
  class="port-icon"
  class:running={state === "running"}
  class:inactive={state === "inactive"}
  class:disabled={state === "disabled"}
  class:sm={size === "sm"}
  class:md={size === "md"}
  aria-label={state}
></span>

<style>
  .port-icon {
    display: inline-block;
    flex-shrink: 0;
    position: relative;
  }

  .port-icon::before,
  .port-icon::after {
    content: "";
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    background: currentColor;
  }

  .port-icon::before {
    top: 0;
    border-radius: 3px;
  }

  .port-icon::after {
    bottom: 0;
    border-radius: 0 0 2px 2px;
  }

  .port-icon.sm {
    width: 22px;
    height: 21px;
  }

  .port-icon.sm::before {
    width: 22px;
    height: 18px;
  }

  .port-icon.sm::after {
    width: 6px;
    height: 3px;
  }

  .port-icon.md {
    width: 28px;
    height: 26px;
  }

  .port-icon.md::before {
    width: 28px;
    height: 22px;
  }

  .port-icon.md::after {
    width: 8px;
    height: 4px;
  }

  .port-icon.running {
    color: #35a861;
  }

  .port-icon.inactive {
    color: #c8d0d8;
  }

  .port-icon.disabled {
    color: #d0d5da;
    opacity: 0.45;
  }
</style>
