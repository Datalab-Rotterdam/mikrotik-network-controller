<script lang="ts">
  export type StatusValue =
    | "online"
    | "offline"
    | "auth_failed"
    | "blocked"
    | "unknown"
    | "discovered";

  let {
    status,
    size = "sm",
  }: {
    status: StatusValue;
    size?: "sm" | "md";
  } = $props();

  const colorMap: Record<
    StatusValue,
    { dot: string; text: string; bg: string }
  > = {
    online: {
      dot: "var(--color-success, #16a34a)",
      text: "var(--color-success, #16a34a)",
      bg: "var(--color-success-light, #bbf7d0)",
    },
    offline: {
      dot: "var(--color-danger, #8a1f1f)",
      text: "var(--color-danger, #8a1f1f)",
      bg: "var(--color-danger-light, #efb8b8)",
    },
    auth_failed: {
      dot: "var(--color-danger, #8a1f1f)",
      text: "var(--color-danger, #8a1f1f)",
      bg: "var(--color-danger-light, #efb8b8)",
    },
    blocked: {
      dot: "var(--color-danger, #8a1f1f)",
      text: "var(--color-danger, #8a1f1f)",
      bg: "var(--color-danger-light, #efb8b8)",
    },
    unknown: {
      dot: "var(--color-muted, #686c6b)",
      text: "var(--color-muted, #686c6b)",
      bg: "var(--color-line, #dedfde)",
    },
    discovered: {
      dot: "var(--color-warning, #f59e0b)",
      text: "var(--color-warning, #f59e0b)",
      bg: "var(--color-warning-light, #fef3c7)",
    },
  };

  const labelMap: Record<StatusValue, string> = {
    online: "Online",
    offline: "Offline",
    auth_failed: "Auth failed",
    blocked: "Blocked",
    unknown: "Unknown",
    discovered: "Discovered",
  };

  const color = $derived(colorMap[status] ?? colorMap.unknown);
  const label = $derived(labelMap[status] ?? status);
</script>

<span
  class="status-badge"
  class:status--sm={size === "sm"}
  class:status--md={size === "md"}
>
  <span class="status-dot" style="background: {color.dot}"></span>
  <span class="status-label" style="color: {color.text}">{label}</span>
</span>

<style lang="scss">
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    line-height: 1;

    &.status--sm {
      padding: 2px 8px 2px 4px;
      border-radius: var(--radius-pill, 999px);
      font-size: 11px;
      background: color-mix(
        in srgb,
        var(--color-warning-light, #fef3c7) 40%,
        transparent
      );
    }

    &.status--md {
      padding: 4px 12px 4px 6px;
      border-radius: var(--radius-pill, 999px);
      font-size: 12px;
    }
  }

  .status-dot {
    --dot-size: 6px;
    width: var(--dot-size);
    height: var(--dot-size);
    border-radius: 50%;
    flex-shrink: 0;

    .status--md & {
      --dot-size: 7px;
    }
  }
</style>
