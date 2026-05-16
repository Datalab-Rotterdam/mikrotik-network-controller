<script lang="ts">
  export type HealthStatus =
    | 'online'
    | 'offline'
    | 'success'
    | 'warning'
    | 'danger'
    | 'discovered'
    | 'unknown'
    | string;

  let {
    status,
    size = 8,
  }: {
    status: HealthStatus;
    size?: number;
  } = $props();

  const colorMap: Record<string, string> = {
    online:     'var(--color-success, #16a34a)',
    success:    'var(--color-success, #16a34a)',
    offline:    'var(--color-danger, #8a1f1f)',
    danger:     'var(--color-danger, #8a1f1f)',
    warning:    'var(--color-warning, #f59e0b)',
    discovered: 'var(--color-warning, #f59e0b)',
    unknown:    'var(--color-muted, #686c6b)',
  };

  const color = $derived(colorMap[status] ?? colorMap.unknown);
</script>

<span
  class="health-indicator"
  style="width:{size}px;height:{size}px;background:{color}"
  title={status}
  aria-label={status}
></span>

<style lang="scss">
  .health-indicator {
    display: inline-block;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
