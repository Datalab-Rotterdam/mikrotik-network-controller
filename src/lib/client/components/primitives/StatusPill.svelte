<script lang="ts">
  export type StatusPillStatus =
    | 'running'
    | 'success'
    | 'active'
    | 'resolved'
    | 'danger'
    | 'failed'
    | 'revert_failed'
    | 'warning'
    | 'rolling_back'
    | 'needs_attention'
    | 'acknowledged'
    | 'muted'
    | 'cancelled'
    | 'reverted'
    | 'queued'
    | 'disabled'
    | string;

  let {
    status,
    label,
    size = 'md',
  }: {
    status: StatusPillStatus;
    label?: string;
    size?: 'sm' | 'md';
  } = $props();

  type ColorConfig = { bg: string; color: string; border: string };

  const colorMap: Record<string, ColorConfig> = {
    running:       { bg: '#eef6ff', color: 'var(--color-link, #0d6fd6)',      border: '#b9daf8' },
    success:       { bg: '#effaf2', color: '#237a3b',                          border: '#b7dfc2' },
    active:        { bg: '#effaf2', color: '#237a3b',                          border: '#b7dfc2' },
    resolved:      { bg: '#effaf2', color: '#237a3b',                          border: '#b7dfc2' },
    danger:        { bg: '#fff2f2', color: 'var(--color-danger, #8a1f1f)',     border: '#efb8b8' },
    failed:        { bg: '#fff2f2', color: 'var(--color-danger, #8a1f1f)',     border: '#efb8b8' },
    revert_failed: { bg: '#fff2f2', color: 'var(--color-danger, #8a1f1f)',     border: '#efb8b8' },
    warning:       { bg: '#fff8df', color: '#7a5b12',                          border: '#e8d391' },
    rolling_back:  { bg: '#fff8df', color: '#7a5b12',                          border: '#e8d391' },
    needs_attention:{ bg: '#fff8df', color: '#7a5b12',                         border: '#e8d391' },
    acknowledged:  { bg: '#fff8df', color: '#7a5b12',                          border: '#e8d391' },
    muted:         { bg: '#f4f6f8', color: '#606b74',                          border: '#d7dde2' },
    cancelled:     { bg: '#f4f6f8', color: '#606b74',                          border: '#d7dde2' },
    reverted:      { bg: '#f4f6f8', color: '#606b74',                          border: '#d7dde2' },
    disabled:      { bg: '#f4f6f8', color: '#606b74',                          border: '#d7dde2' },
    queued:        { bg: '#f7fbff', color: '#5f7180',                          border: '#dfe7ed' },
  };

  const fallback: ColorConfig = { bg: '#f4f6f8', color: '#606b74', border: '#d7dde2' };
  const colors = $derived(colorMap[status] ?? fallback);
  const displayLabel = $derived(label ?? status);
</script>

<span
  class="status-pill status-pill--{size}"
  style="background:{colors.bg};color:{colors.color};border-color:{colors.border}"
>
  {displayLabel}
</span>

<style lang="scss">
  .status-pill {
    display: inline-flex;
    align-items: center;
    border: 1px solid;
    border-radius: var(--radius-pill, 999px);
    font-weight: 650;
    white-space: nowrap;

    &--sm {
      height: 20px;
      padding: 0 7px;
      font-size: 10px;
    }

    &--md {
      min-height: 22px;
      padding: 0 9px;
      font-size: 11px;
    }
  }
</style>
