<script lang="ts">
  import { useActionSocket } from "$lib/client/actions/use-action-socket";
  import type { ActionEvent } from "$lib/shared/action-events";
  import { Page, PageHeader } from "$lib/client/components/layout";
  import { StatCard, DeviceHealthCard } from "$lib/client/components/ui";
  import { Icon, SectionLabel, Tag, LinkButton, DetailCard } from "$lib/client/components/primitives";

  let { data } = $props();

  const actions = useActionSocket();
  const basePath = $derived(`/manage/${data.site.id}`);

  // ── Live state ──────────────────────────────────────────────────
  let liveClientCount = $state(data.summary.activeClientCount);
  const liveStatusOverrides = $state(new Map<string, string>());
  let statusTick = $state(0);

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
      data.summary.latestMetrics.map((m) => [m.deviceId, { ...m, siteId: data.site.id }]),
    ),
  );

  $effect(() =>
    actions.subscribe(
      ["metric.updated", "client.updated", "device.updated", "device.removed"],
      (event: ActionEvent) => {
        if (event.type === "metric.updated") {
          liveMetrics.set(event.payload.deviceId, event.payload);
        }
        if (event.type === "client.updated" && event.payload.siteId === data.site.id) {
          liveClientCount = event.payload.activeCount;
        }
        if (event.type === "device.updated" && event.payload.siteId === data.site.id) {
          const status = event.payload.connectionStatus;
          if (status) {
            liveStatusOverrides.set(event.payload.deviceId, status);
            statusTick++;
          }
        }
        if (event.type === "device.removed" && event.payload.siteId === data.site.id) {
          liveStatusOverrides.delete(event.payload.deviceId);
          statusTick++;
        }
      },
    ),
  );

  // ── Derived counts ───────────────────────────────────────────────
  const liveOnlineCount = $derived.by(() => {
    void statusTick;
    return data.siteDevices.reduce((n, d) => {
      const s = liveStatusOverrides.get(d.id) ?? d.connectionStatus;
      return s === "online" ? n + 1 : n;
    }, 0);
  });

  // ── Helpers ──────────────────────────────────────────────────────
  function deviceStatus(deviceId: string, fallback: string): string {
    return liveStatusOverrides.get(deviceId) ?? fallback;
  }

  function jobTagVariant(status: string): "default" | "info" | "success" | "danger" | "warning" {
    if (status === "running") return "info";
    if (status === "done") return "success";
    if (status === "failed") return "danger";
    if (status === "rolling_back" || status === "rolled_back") return "warning";
    return "default";
  }

  function jobLabel(type: string): string {
    // "devices.port.configure" → "Port configure"
    const parts = type.split(".");
    const tail = parts.slice(1).join(" ");
    return tail.charAt(0).toUpperCase() + tail.slice(1);
  }

  function relativeTime(date: string | Date): string {
    const ms = Date.now() - new Date(date).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

{#snippet adoptAction()}
  <LinkButton href={`${basePath}/devices?adopt=`} variant="secondary" size="sm">
    <Icon name="plus" size={14} />
    Adopt Device
  </LinkButton>
{/snippet}

<Page>
  <PageHeader title={data.site.name} subtitle="Dashboard" actions={adoptAction} />

  <!-- Summary stats -->
  <div class="stat-grid">
    <StatCard
      label="Devices"
      value={data.summary.deviceCount}
      sub="{liveOnlineCount} online"
    />
    <StatCard
      label="Online"
      value={liveOnlineCount}
      sub="of {data.summary.deviceCount} total"
    />
    <StatCard
      label="Clients"
      value={liveClientCount}
      sub="connected"
    />
    <StatCard
      label="Alerts"
      value={data.unacknowledgedAlertCount ?? 0}
      sub="unacknowledged"
    />
  </div>

  <!-- Device health cards -->
  {#if data.siteDevices.length > 0}
    <section aria-label="Device health">
      <SectionLabel>Devices</SectionLabel>
      <div class="device-row">
        {#each data.siteDevices as device}
          <DeviceHealthCard
            name={device.name ?? device.identity ?? "Unknown"}
            model={device.model}
            connectionStatus={deviceStatus(device.id, device.connectionStatus)}
            href="{basePath}/devices/{device.id}"
            metric={liveMetrics.get(device.id)}
          />
        {/each}
      </div>
    </section>
  {/if}

  <!-- Bottom panels -->
  <div class="dash-grid">
    <!-- Recent jobs -->
    <DetailCard title="Recent Jobs" flush>
      {#snippet actions()}
        <a class="dash-panel-link" href="{basePath}/jobs">View all →</a>
      {/snippet}
      {#if data.recentJobs.length}
        <ul class="job-list">
          {#each data.recentJobs as job}
            {@const deviceName = data.siteDevices.find((d) => d.id === job.deviceId)?.name
              ?? data.siteDevices.find((d) => d.id === job.deviceId)?.identity
              ?? null}
            <li class="job-row">
              <div class="job-info">
                <a class="job-name" href="{basePath}/jobs?job={job.id}">{jobLabel(job.type)}</a>
                {#if deviceName}
                  <span class="job-device">{deviceName}</span>
                {/if}
              </div>
              <div class="job-meta">
                <Tag variant={jobTagVariant(job.status)} label={job.status} size="sm" />
                <span class="job-time">{relativeTime(job.createdAt)}</span>
              </div>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="dash-empty">No jobs run yet.</p>
      {/if}
    </DetailCard>

    <!-- Recent activity -->
    <DetailCard title="Activity" flush>
      {#snippet actions()}
        <span class="dash-panel-count">{data.summary.recentAuditEvents.length}</span>
      {/snippet}
      {#if data.summary.recentAuditEvents.length}
        <ul class="activity-list">
          {#each data.summary.recentAuditEvents as event}
            <li class="activity-row">
              <div class="activity-info">
                <span class="activity-action">{event.action}</span>
                {#if event.message}
                  <span class="activity-msg">{event.message}</span>
                {/if}
              </div>
              <span class="activity-time">{relativeTime(event.createdAt)}</span>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="dash-empty">No audit events yet.</p>
      {/if}
    </DetailCard>
  </div>
</Page>

<style lang="scss">
  /* ── Stat grid ───────────────────────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;

    @media (max-width: 900px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ── Device row ──────────────────────────────────────── */
  .device-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  /* ── Bottom grid ─────────────────────────────────────── */
  .dash-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  /* ── Panel link / count (rendered inside DetailCard actions slot) ── */
  .dash-panel-link {
    font-size: 12px;
    color: var(--color-link);
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }

  .dash-panel-count {
    font-size: 12px;
    color: var(--color-muted, #686c6b);
    font-weight: 600;
  }

  /* ── Job list ────────────────────────────────────────── */
  .job-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .job-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 16px;
    border-bottom: 1px solid var(--color-border, var(--color-line));

    &:last-child { border-bottom: none; }
  }

  .job-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .job-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &:hover { text-decoration: underline; color: var(--color-link); }
  }

  .job-device {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
  }

  .job-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .job-time {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
    white-space: nowrap;
  }

  /* ── Activity list ───────────────────────────────────── */
  .activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .activity-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 16px;
    border-bottom: 1px solid var(--color-border, var(--color-line));

    &:last-child { border-bottom: none; }
  }

  .activity-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .activity-action {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text);
  }

  .activity-msg {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    font-size: 11px;
    color: var(--color-muted, #686c6b);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Empty ───────────────────────────────────────────── */
  .dash-empty {
    margin: 0;
    padding: 24px 16px;
    font-size: 13px;
    color: var(--color-muted, #686c6b);
    text-align: center;
  }
</style>
