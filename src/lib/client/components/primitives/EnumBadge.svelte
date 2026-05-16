<script lang="ts">
  export type EnumBadgePreset = 'chain' | 'action' | 'severity';

  type ColorEntry = { bg: string; color: string };

  const presets: Record<EnumBadgePreset, Record<string, ColorEntry>> = {
    chain: {
      input:   { bg: '#e8f4fd', color: '#1565c0' },
      forward: { bg: '#e8f0fe', color: '#3949ab' },
      output:  { bg: '#f3e8fd', color: '#6a1b9a' },
    },
    action: {
      accept:      { bg: '#e8f5e9', color: '#2e7d32' },
      drop:        { bg: '#fce4ec', color: '#b71c1c' },
      reject:      { bg: '#fff3e0', color: '#e65100' },
      log:         { bg: '#f3f4f6', color: '#374151' },
      jump:        { bg: '#fafafa', color: '#6b7280' },
      return:      { bg: '#fafafa', color: '#6b7280' },
      passthrough: { bg: '#fafafa', color: '#6b7280' },
    },
    severity: {
      critical: { bg: 'color-mix(in srgb, var(--color-danger, #ef4444) 15%, transparent)',  color: 'var(--color-danger, #ef4444)' },
      warning:  { bg: 'color-mix(in srgb, var(--color-warning, #f59e0b) 15%, transparent)', color: 'var(--color-warning, #f59e0b)' },
      info:     { bg: 'color-mix(in srgb, var(--color-link, #3b82f6) 15%, transparent)',    color: 'var(--color-link, #3b82f6)' },
    },
  };

  const fallback: ColorEntry = { bg: '#f3f4f6', color: '#374151' };

  let {
    value,
    preset,
    colorMap,
  }: {
    value: string;
    preset?: EnumBadgePreset;
    colorMap?: Record<string, ColorEntry>;
  } = $props();

  const resolvedMap = $derived(colorMap ?? (preset ? presets[preset] : undefined) ?? {});
  const colors = $derived(resolvedMap[value] ?? fallback);
</script>

<span
  class="enum-badge"
  style="background:{colors.bg};color:{colors.color}"
>
  {value}
</span>

<style lang="scss">
  .enum-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: var(--radius-sm, 3px);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }
</style>
