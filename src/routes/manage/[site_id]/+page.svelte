<script lang="ts">
  import { useActionSocket } from "$lib/client/actions/use-action-socket";
  import type { ActionEvent } from "$lib/shared/action-events";
  import { ContentGrid, PageShell } from "$lib/client/components/layout";
  import { StatCard } from "$lib/client/components/ui";
  import PageHeader from "$lib/client/components/primitives/PageHeader.svelte";

  let { data } = $props();

  const actions = useActionSocket();

  // Live-updated counts and per-device metrics
  let liveClientCount = $state(data.summary.activeClientCount);

  // Tracks per-device connection status overrides from WebSocket events.
  const liveStatusOverrides = $state(new Map<string, string>());
  let statusTick = $state(0);

  const liveOnlineCount = $derived.by(() => {
    // Subscribe to statusTick to force re-derivation on map mutations
    void statusTick;
    return data.siteDevices.reduce((count, d) => {
      const status = liveStatusOverrides.get(d.id) ?? d.connectionStatus;
      return status === "online" ? count + 1 : count;
    }, 0);
  });

  type MetricSnapshot = {
    deviceId: string;
    siteId: string | null;
    cpuPercent: number | null;
    freeMemoryBytes: number | null;
    totalMemoryBytes: number | null;
    temperatureCelsius: number | null;
    uptimeSeconds: number | null;
    collectedAt: string | Date;
  };

  const liveMetrics = $state(
    new Map<string, MetricSnapshot>(
      data.summary.latestMetrics.map((m) => [
        m.deviceId,
        { ...m, siteId: data.site.id } as MetricSnapshot,
      ]),
    ),
  );

  $effect(() =>
    actions.subscribe(
      ["metric.updated", "client.updated", "device.updated", "device.removed"],
      (event: ActionEvent) => {
        if (event.type === "metric.updated") {
          liveMetrics.set(event.payload.deviceId, event.payload);
        }
        if (
          event.type === "client.updated" &&
          event.payload.siteId === data.site.id
        ) {
          liveClientCount = event.payload.activeCount;
        }
        if (
          event.type === "device.updated" &&
          event.payload.siteId === data.site.id
        ) {
          const status = event.payload.connectionStatus;
          if (status) {
            liveStatusOverrides.set(event.payload.deviceId, status);
            statusTick++;
          }
        }
        if (
          event.type === "device.removed" &&
          event.payload.siteId === data.site.id
        ) {
          liveStatusOverrides.delete(event.payload.deviceId);
          statusTick++;
        }
      },
    ),
  );

  const metrics = $derived([
    { label: "Devices", value: data.summary.deviceCount },
    { label: "Online", value: liveOnlineCount },
    { label: "Clients", value: liveClientCount },
    { label: "Alerts", value: 0 },
  ]);

  function memPercent(
    free: number | null,
    total: number | null,
  ): number | null {
    if (!free || !total || total === 0) return null;
    return Math.round(((total - free) / total) * 100);
  }

  function statusClass(status: string): string {
    if (status === "online") return "status-online";
    if (status === "offline") return "status-offline";
    if (status === "auth_failed") return "status-error";
    return "status-unknown";
  }
</script>

{#snippet dashboardActions()}
  <a
    class="icon-action"
    href={`/manage/${data.site.id}/devices?adopt=`}
    aria-label="Start adoption"
    title="Start adoption"
  >
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
    </svg>
  </a>
{/snippet}

<PageShell>
  <PageHeader
    title="Dashboard"
    subtitle={`${data.summary.deviceCount} devices · ${liveOnlineCount} online · ${liveClientCount} clients`}
    actions={dashboardActions}
  />

  <section aria-label="Network summary">
    <ContentGrid>
      {#each metrics as metric}
        <StatCard label={metric.label} value={metric.value} />
      {/each}
    </ContentGrid>
  </section>

  {#if data.siteDevices.length > 0}
    <section class="health-row" aria-label="Device health">
      {#each data.siteDevices as device}
        {@const metric = liveMetrics.get(device.id)}
      {@const usedMem = memPercent(
        metric?.freeMemoryBytes ?? null,
        metric?.totalMemoryBytes ?? null,
      )}
      <a
        class="health-card"
        href={`/manage/${data.site.id}/devices/${device.id}`}
      >
        <div class="health-card-header">
          <span
            class={`status-dot ${statusClass(device.connectionStatus)}`}
            aria-hidden="true"
          ></span>
          <span class="device-name">{device.identity ?? device.name}</span>
        </div>
        {#if metric}
          <div class="health-gauges">
            <div class="gauge" title="CPU usage">
              <div class="gauge-label">CPU</div>
              <div class="gauge-bar">
                <div
                  class="gauge-fill"
                  class:gauge-warn={metric.cpuPercent !== null &&
                    metric.cpuPercent > 70}
                  class:gauge-crit={metric.cpuPercent !== null &&
                    metric.cpuPercent > 90}
                  style:width="{metric.cpuPercent ?? 0}%"
                ></div>
              </div>
              <div class="gauge-value">
                {metric.cpuPercent?.toFixed(0) ?? "—"}%
              </div>
            </div>
            <div class="gauge" title="Memory usage">
              <div class="gauge-label">MEM</div>
              <div class="gauge-bar">
                <div
                  class="gauge-fill"
                  class:gauge-warn={usedMem !== null && usedMem > 70}
                  class:gauge-crit={usedMem !== null && usedMem > 90}
                  style:width="{usedMem ?? 0}%"
                ></div>
              </div>
              <div class="gauge-value">{usedMem ?? "—"}%</div>
            </div>
          </div>
          {#if metric.temperatureCelsius !== null}
            <div class="health-temp">
              {metric.temperatureCelsius.toFixed(0)}°C
            </div>
          {/if}
        {:else}
          <div class="health-no-data">No metrics yet</div>
        {/if}
      </a>
    {/each}
  </section>
{/if}

<section class="dashboard-grid">
  <div class="dashboard-panel map-panel">
    <h2>Network map</h2>
    <div class="map-empty">
      <svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm2.5-7 5.2 6.4 1.6-1.3L11.1 7.7 9.5 9Zm.5 9h4v-2h-4v2Z"
        />
      </svg>
      <div>
        <strong>Topology coming soon</strong>
        <p>Live network map will be available once link discovery completes.</p>
      </div>
    </div>
  </div>

  <div class="dashboard-panel">
    <div class="panel-title">
      <h2>Recent activity</h2>
      <span>{data.summary.recentAuditEvents.length}</span>
    </div>
    {#if data.summary.recentAuditEvents.length}
      <table class="activity-table">
        <thead>
          <tr>
            <th>Action</th>
            <th>Message</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {#each data.summary.recentAuditEvents as event}
            <tr>
              <td>{event.action}</td>
              <td>{event.message ?? "Controller event"}</td>
              <td>{event.createdAt.toLocaleString()}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <div class="activity-empty">No audit events recorded yet.</div>
    {/if}
  </div>
</section>
</PageShell>

<style lang="scss">
  .icon-action {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-link);
    background: var(--color-surface);
    cursor: pointer;
    text-decoration: none;

    &:hover {
      border-color: var(--color-link);
      background: var(--color-surface-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  /* Device health strip */
  .health-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .health-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 160px;
    flex: 1 1 160px;
    padding: 12px 14px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
    transition: border-color 0.15s;

    &:hover {
      border-color: var(--color-link);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  .health-card-header {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .device-name {
    font-size: 12px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.status-online {
      background: var(--color-success, #22c55e);
    }
    &.status-offline {
      background: var(--color-danger, #ef4444);
    }
    &.status-error {
      background: var(--color-warning, #f59e0b);
    }
    &.status-unknown {
      background: var(--color-muted, #9ca3af);
    }
  }

  .health-gauges {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .gauge {
    display: grid;
    grid-template-columns: 30px 1fr 32px;
    align-items: center;
    gap: 6px;
  }

  .gauge-label {
    color: var(--color-muted);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .gauge-bar {
    height: 5px;
    background: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }

  .gauge-fill {
    height: 100%;
    background: var(--color-link, #3b82f6);
    border-radius: 3px;
    transition: width 0.4s ease;

    &.gauge-warn {
      background: var(--color-warning, #f59e0b);
    }
    &.gauge-crit {
      background: var(--color-danger, #ef4444);
    }
  }

  .gauge-value {
    color: var(--color-muted);
    font-size: 11px;
    text-align: right;
  }

  .health-temp {
    color: var(--color-muted);
    font-size: 11px;
  }

  .health-no-data {
    color: var(--color-muted);
    font-size: 11px;
    font-style: italic;
  }

  /* Dashboard panels */
  .dashboard-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
    gap: 14px;
  }

  .dashboard-panel {
    min-width: 0;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    overflow: hidden;

    h2 {
      margin: 0;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 14px;
      font-weight: 800;
    }
  }

  .map-empty,
  .activity-empty {
    display: grid;
    place-items: center;
    min-height: 320px;
    color: var(--color-muted);
    text-align: center;
  }

  .map-empty {
    gap: 12px;
    color: var(--color-border);

    strong {
      display: block;
      margin-bottom: 8px;
      color: var(--color-muted);
    }

    p {
      max-width: 390px;
      margin: 0;
    }
  }

  .panel-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border);

    h2 {
      border-bottom: 0;
    }

    span {
      margin-right: 16px;
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 800;
    }
  }

  .activity-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;

    th,
    td {
      height: 42px;
      padding: 0 14px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 13px;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    th {
      font-weight: 800;
    }
  }

  @media (max-width: 900px) {
    .metric-row,
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .metric-cell {
      border-right: 0;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: 0;
      }
    }

    .dashboard-toolbar {
      align-items: flex-start;
      padding: 12px 18px;
      flex-direction: column;
    }
  }
</style>
