<script lang="ts">
  import { page } from '$app/state';
  import {PageShell} from "$lib/client/components/layout/Page/index.ts";
  import {EmptyState} from "$lib/client/components/primitives";
  import { Page, PageHeader } from '$lib/client/components/layout';
  import { useActionSocket } from '$lib/client/actions/use-action-socket';
  import type { SyslogEventPayload } from '$lib/shared/action-events';

  let { data } = $props();

  const SEVERITIES = ['', 'emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug'] as const;
  const CATEGORIES = ['', 'device', 'security', 'system', 'adopt', 'discovery', 'backup'] as const;

  // Live events pushed via websocket prepend to local list
  let liveEvents = $state<SyslogEventPayload[]>([]);

  const actions = useActionSocket();
  $effect(() =>
    actions.subscribe(['syslog.event'], (event) => {
      if (event.type === 'syslog.event') {
        liveEvents = [event.payload as SyslogEventPayload, ...liveEvents].slice(0, 300);
      }
    })
  );

  // Merge live events with server-loaded, deduplicate by id
  const serverIds = $derived(new Set(data.events.map((e) => e.id)));
  const merged = $derived([
    ...liveEvents.filter((e) => !serverIds.has(e.id)),
    ...data.events.map((e) => ({
      ...e,
      createdAt: typeof e.createdAt === 'string' ? e.createdAt : (e.createdAt as Date).toISOString(),
    })),
  ]);

  function severityWeight(s: string) {
    const order = ['emergency','alert','critical','error','warning','notice','info','debug'];
    return order.indexOf(s);
  }

  function formatTs(value: string | Date) {
    const d = typeof value === 'string' ? new Date(value) : value;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).format(d);
  }

  function deviceName(id: string | null | undefined) {
    if (!id) return null;
    return data.deviceMap[id] ?? null;
  }

  function buildUrl(params: Record<string, string>) {
    const u = new URL(page.url);
    for (const [k, v] of Object.entries(params)) {
      if (v) u.searchParams.set(k, v);
      else u.searchParams.delete(k);
    }
    return u.pathname + u.search;
  }
</script>

{#snippet headerActions()}
  <div class="filter-bar">
    <select
      value={data.filters.severity}
      onchange={(e) => { window.location.href = buildUrl({ severity: (e.currentTarget as HTMLSelectElement).value, category: data.filters.category }); }}
    >
      <option value="">All severities</option>
      {#each SEVERITIES.slice(1) as s}
        <option value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
      {/each}
    </select>

    <select
      value={data.filters.category}
      onchange={(e) => { window.location.href = buildUrl({ severity: data.filters.severity, category: (e.currentTarget as HTMLSelectElement).value }); }}
    >
      <option value="">All categories</option>
      {#each CATEGORIES.slice(1) as c}
        <option value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
      {/each}
    </select>

    {#if data.filters.severity || data.filters.category}
      <a href={buildUrl({ severity: '', category: '' })} class="clear-btn">Clear</a>
    {/if}
  </div>
{/snippet}

<Page>
  <PageHeader
    title="Syslog"
    subtitle="Device events, connection changes, and job activity."
    actions={headerActions}
  />
  <PageShell>
    {#if merged.length === 0}
      <EmptyState icon="jobs" title="No events yet." description="Events appear as devices connect, disconnect, or jobs run." />
    {:else}
      <div class="log-table" role="table" aria-label="Syslog events">
        <div class="log-head" role="row">
          <span role="columnheader">Time</span>
          <span role="columnheader">Severity</span>
          <span role="columnheader">Category</span>
          <span role="columnheader">Device</span>
          <span role="columnheader">Message</span>
        </div>
        <div class="log-body">
          {#each merged as event (event.id)}
            {@const name = deviceName(event.deviceId)}
            <div class="log-row sev-{event.severity}" role="row">
              <time class="log-time" datetime={event.createdAt}>{formatTs(event.createdAt)}</time>
              <span class="sev-badge sev-badge-{event.severity}">{event.severity}</span>
              <span class="log-cat">{event.category}</span>
              <span class="log-device">{name ?? '—'}</span>
              <span class="log-msg">
                <strong>{event.title}</strong>
                {#if event.message !== event.title}
                  <span>{event.message}</span>
                {/if}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </PageShell>
</Page>

<style lang="scss">
  .filter-bar {
    display: flex;
    align-items: center;
    gap: 8px;

    select {
      padding: 5px 9px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-surface);
      color: var(--color-text);
      font-size: 13px;
      cursor: pointer;

      &:focus {
        outline: 2px solid var(--color-link);
        outline-offset: 1px;
      }
    }
  }

  .clear-btn {
    padding: 5px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-muted);
    font-size: 13px;
    text-decoration: none;

    &:hover { color: var(--color-text); }
  }


  .log-table {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .log-head {
    display: grid;
    grid-template-columns: 160px 80px 90px 130px 1fr;
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-page);
    color: var(--color-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    font-family: inherit;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .log-body {
    overflow-y: auto;
    flex: 1 1 auto;
  }

  .log-row {
    display: grid;
    grid-template-columns: 160px 80px 90px 130px 1fr;
    gap: 12px;
    align-items: baseline;
    padding: 6px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
    line-height: 1.4;

    &:last-child { border-bottom: 0; }

    &:hover { background: color-mix(in srgb, var(--color-border) 20%, transparent); }

    &.sev-error, &.sev-critical, &.sev-alert, &.sev-emergency {
      background: color-mix(in srgb, #ef4444 4%, transparent);
    }
    &.sev-warning {
      background: color-mix(in srgb, #f59e0b 4%, transparent);
    }
  }

  .log-time {
    color: var(--color-muted);
    white-space: nowrap;
  }

  .sev-badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;

    &.sev-badge-info     { background: color-mix(in srgb, #0f6fff 12%, transparent); color: #0f6fff; }
    &.sev-badge-notice   { background: color-mix(in srgb, #16a26b 12%, transparent); color: #16a26b; }
    &.sev-badge-warning  { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #b45309; }
    &.sev-badge-error    { background: color-mix(in srgb, #ef4444 12%, transparent); color: #dc2626; }
    &.sev-badge-critical { background: #ef4444; color: #fff; }
    &.sev-badge-alert    { background: #dc2626; color: #fff; }
    &.sev-badge-emergency{ background: #7f1d1d; color: #fff; }
    &.sev-badge-debug    { background: color-mix(in srgb, var(--color-border) 60%, transparent); color: var(--color-muted); }
  }

  .log-cat {
    color: var(--color-muted);
    text-transform: capitalize;
  }

  .log-device {
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .log-msg {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    strong {
      color: var(--color-text);
      font-weight: 600;
      font-size: 12px;
    }

    span {
      color: var(--color-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 760px) {
    .log-head,
    .log-row {
      grid-template-columns: 120px 70px 1fr;
    }

    .log-head span:nth-child(4),
    .log-row .log-device,
    .log-head span:nth-child(3),
    .log-row .log-cat {
      display: none;
    }
  }
</style>
