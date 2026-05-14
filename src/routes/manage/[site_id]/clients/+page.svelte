<script lang="ts">
  import PageHeader from "$lib/client/components/primitives/PageHeader.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import { PageShell } from "$lib/client/components/layout";

  let { data } = $props();

  type Filter = "all" | "wired" | "wireless";
  let filter = $state<Filter>("all");
  let search = $state("");

  const deviceMap = $derived(new Map(data.siteDevices.map((d) => [d.id, d])));

  const filtered = $derived(
    data.clients.filter((c) => {
      if (filter === "wired" && c.isWireless) return false;
      if (filter === "wireless" && !c.isWireless) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.macAddress.toLowerCase().includes(q) ||
          (c.ipAddress ?? "").toLowerCase().includes(q) ||
          (c.hostname ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    }),
  );

  function relativeTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }
</script>

<PageShell>
  <PageHeader
    title="Clients"
    subtitle={`${data.clients.length} active client${data.clients.length !== 1 ? 's' : ''} across ${data.siteDevices.length} device${data.siteDevices.length !== 1 ? 's' : ''}`}
  />

  <div class="toolbar">
    <div class="filter-tabs" role="tablist" aria-label="Client type filter">
      {#each ["all", "wired", "wireless"] as tab}
        <button
          role="tab"
          aria-selected={filter === tab}
          class:active={filter === tab}
          onclick={() => (filter = tab as Filter)}
        >
          {tab === "all" ? "All" : tab === "wired" ? "Wired" : "Wireless"}
        </button>
      {/each}
    </div>

    <Input
      type="search"
      name="clientSearch"
      placeholder="Search MAC, IP, hostname…"
      value={search}
      oninput={(e: Event) => (search = (e.target as HTMLInputElement).value)}
    />
  </div>

<div class="panel">
  {#if data.clients.length === 0}
    <div class="empty-state">
      <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <path
          fill="currentColor"
          d="M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0ZM12 2a1 1 0 0 1 1 1v1.07A9.003 9.003 0 0 1 20.93 11H22a1 1 0 1 1 0 2h-1.07A9.003 9.003 0 0 1 13 20.93V22a1 1 0 1 1-2 0v-1.07A9.003 9.003 0 0 1 3.07 13H2a1 1 0 1 1 0-2h1.07A9.003 9.003 0 0 1 11 3.07V2a1 1 0 0 1 1-1Z"
        />
      </svg>
      <strong>No clients yet</strong>
      <p>
        Clients appear automatically once devices start reporting DHCP leases
        and ARP entries.
      </p>
    </div>
  {:else if filtered.length === 0}
    <div class="empty-state">No clients match your filter.</div>
  {:else}
    <table class="client-table">
      <thead>
        <tr>
          <th>MAC</th>
          <th>IP Address</th>
          <th>Hostname</th>
          <th>Device</th>
          <th>Interface</th>
          <th>Type</th>
          <th>Last seen</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as client (client.id)}
          {@const device = deviceMap.get(client.deviceId)}
          <tr>
            <td class="mono">{client.macAddress}</td>
            <td class="mono">{client.ipAddress ?? "—"}</td>
            <td>{client.hostname ?? "—"}</td>
            <td>
              {#if device}
                <a
                  href={`/manage/${data.site.id}/devices/${device.id}`}
                  class="device-link"
                >
                  {device.name ?? device.identity}
                </a>
              {:else}
                —
              {/if}
            </td>
            <td>{client.interfaceName ?? "—"}</td>
            <td>
              {#if client.isWireless}
                <span class="badge badge-wireless">
                  Wireless{client.ssid ? ` · ${client.ssid}` : ""}
                  {#if client.signalStrength !== null}
                    <span class="signal">{client.signalStrength} dBm</span>
                  {/if}
                </span>
              {:else}
                <span class="badge badge-wired">Wired</span>
              {/if}
            </td>
            <td class="muted">{relativeTime(client.lastSeenAt)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>
</PageShell>

<style lang="scss">
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .filter-tabs {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;

    button {
      padding: 6px 14px;
      border: none;
      border-right: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-muted);
      font-size: 13px;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s;

      &:last-child {
        border-right: none;
      }

      &:hover {
        background: var(--color-surface-hover);
        color: var(--color-text);
      }
      &:focus-visible {
        outline: 2px solid var(--color-link);
        outline-offset: -2px;
      }

      &.active {
        background: var(--color-link);
        color: #fff;
      }
    }
  }

  .field {
    flex: 1 1 220px;
    max-width: 320px;
  }

  .panel {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    overflow: hidden;
  }

  .empty-state {
    display: grid;
    place-items: center;
    gap: 10px;
    min-height: 220px;
    padding: 32px;
    color: var(--color-muted);
    text-align: center;

    strong {
      display: block;
      color: var(--color-text);
      font-size: 15px;
    }

    p {
      margin: 0;
      max-width: 380px;
    }
  }

  .client-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 0 14px;
      height: 44px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 13px;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    th {
      background: var(--color-surface);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    tbody tr {
      &:last-child td {
        border-bottom: none;
      }
      &:hover td {
        background: var(--color-surface-hover);
      }
    }
  }

  .mono {
    font-family: monospace;
    font-size: 12px;
  }

  .muted {
    color: var(--color-muted);
  }

  .device-link {
    color: var(--color-link);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
    &:focus-visible {
      outline: 2px solid var(--color-link);
      border-radius: 2px;
    }
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }

  .badge-wired {
    background: var(--color-surface-hover);
    color: var(--color-muted);
  }

  .badge-wireless {
    background: color-mix(in srgb, var(--color-link, #3b82f6) 12%, transparent);
    color: var(--color-link, #3b82f6);
  }

  .signal {
    opacity: 0.75;
    font-weight: 400;
  }

  @media (max-width: 768px) {
    .toolbar {
      flex-direction: column;
      align-items: stretch;
    }
    .field {
      max-width: 100%;
    }

    .client-table th:nth-child(5),
    .client-table td:nth-child(5),
    .client-table th:nth-child(7),
    .client-table td:nth-child(7) {
      display: none;
    }
  }
</style>
