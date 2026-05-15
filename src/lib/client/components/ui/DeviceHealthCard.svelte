<script lang="ts">
  import ProgressBar from "$lib/client/components/primitives/ProgressBar.svelte";
  import StatusBadge from "$lib/client/components/primitives/StatusBadge.svelte";
  import type { StatusValue } from "$lib/client/components/primitives/StatusBadge.svelte";

  type MetricSnapshot = {
    cpuPercent: number | null;
    freeMemoryBytes: number | null;
    totalMemoryBytes: number | null;
    temperatureCelsius: number | null;
    uptimeSeconds: number | null;
  };

  let {
    name,
    model,
    connectionStatus,
    href,
    metric,
  }: {
    name: string;
    model?: string | null;
    connectionStatus: string;
    href: string;
    metric?: MetricSnapshot | null;
  } = $props();

  function toBadgeStatus(s: string): StatusValue {
    if (s === "online") return "online";
    if (s === "offline") return "offline";
    if (s === "auth_failed") return "auth_failed";
    return "unknown";
  }

  function memUsedPercent(free: number | null, total: number | null): number | null {
    if (!free || !total || total === 0) return null;
    return Math.round(((total - free) / total) * 100);
  }

  function barVariant(pct: number | null): "default" | "warning" | "danger" {
    if (pct == null) return "default";
    if (pct > 90) return "danger";
    if (pct > 70) return "warning";
    return "default";
  }

  function formatUptime(seconds: number | null): string {
    if (!seconds || seconds < 0) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const usedMem = $derived(
    memUsedPercent(metric?.freeMemoryBytes ?? null, metric?.totalMemoryBytes ?? null),
  );
  const cpuPct = $derived(metric?.cpuPercent ?? null);
</script>

<a class="dhc" {href}>
  <div class="dhc-header">
    <StatusBadge status={toBadgeStatus(connectionStatus)} size="sm" />
    <span class="dhc-name" title={name}>{name}</span>
  </div>

  {#if model}
    <p class="dhc-model">{model}</p>
  {/if}

  {#if metric}
    <div class="dhc-gauges">
      <div class="dhc-gauge">
        <span class="dhc-gauge-label">CPU</span>
        <ProgressBar value={cpuPct ?? 0} variant={barVariant(cpuPct)} size="sm" />
        <span class="dhc-gauge-val">{cpuPct?.toFixed(0) ?? "—"}%</span>
      </div>
      <div class="dhc-gauge">
        <span class="dhc-gauge-label">MEM</span>
        <ProgressBar value={usedMem ?? 0} variant={barVariant(usedMem)} size="sm" />
        <span class="dhc-gauge-val">{usedMem ?? "—"}%</span>
      </div>
    </div>

    <div class="dhc-meta">
      {#if metric.uptimeSeconds != null}
        <span class="dhc-uptime">↑ {formatUptime(metric.uptimeSeconds)}</span>
      {/if}
      {#if metric.temperatureCelsius != null}
        <span class="dhc-temp">{metric.temperatureCelsius.toFixed(0)}°C</span>
      {/if}
    </div>
  {:else if connectionStatus === "online"}
    <p class="dhc-empty">Collecting metrics…</p>
  {:else}
    <p class="dhc-empty">No data</p>
  {/if}
</a>

<style lang="scss">
  .dhc {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 180px;
    flex: 1 1 180px;
    padding: 14px 16px;
    border: 1px solid var(--color-border, var(--color-line));
    border-radius: var(--radius-md, 6px);
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
    transition: border-color 0.12s;

    &:hover {
      border-color: var(--color-link);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  .dhc-header {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dhc-name {
    font-size: 13px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .dhc-model {
    margin: 0;
    font-size: 11px;
    color: var(--color-muted, #686c6b);
  }

  .dhc-gauges {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .dhc-gauge {
    display: grid;
    grid-template-columns: 30px 1fr 34px;
    align-items: center;
    gap: 6px;
  }

  .dhc-gauge-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-muted, #686c6b);
    text-transform: uppercase;
  }

  .dhc-gauge-val {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
    text-align: right;
  }

  .dhc-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dhc-uptime,
  .dhc-temp {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
  }

  .dhc-empty {
    margin: 0;
    font-size: 11px;
    color: var(--color-muted, #686c6b);
    font-style: italic;
  }
</style>
