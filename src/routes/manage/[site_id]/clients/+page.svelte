<script lang="ts">
  import { Page, Tabs } from "$lib/client/components/layout";
  import {PageHeader} from "$lib/client/components/layout/Page";
  import {
    Card,
    DataTable,
    EmptyState,
    Input,
    Tag,
  } from "$lib/client/components/primitives";
  import { StatCard } from "$lib/client/components/ui";

  let { data } = $props();

  type Filter = "all" | "wired" | "wireless";
  type ClientRow = Record<string, unknown> & {
    id: string;
    macAddress: string;
    ipAddress: string | null;
    hostname: string | null;
    interfaceName: string | null;
    isWireless: boolean;
    ssid: string | null;
    signalStrength: number | null;
    lastSeenAt: Date | string;
    deviceId: string;
    deviceName: string | null;
    deviceIdentity: string | null;
    deviceHref: string;
  };

  let filter = $state<Filter>("all");
  let search = $state("");

  const wiredCount = $derived(data.clients.filter((client) => !client.isWireless).length);
  const wirelessCount = $derived(data.clients.filter((client) => client.isWireless).length);
  const reportingDeviceCount = $derived(new Set(data.clients.map((client) => client.deviceId)).size);

  const filterTabs = $derived([
    { id: "all", label: "All", count: data.clients.length },
    { id: "wired", label: "Wired", count: wiredCount },
    { id: "wireless", label: "Wireless", count: wirelessCount },
  ]);

  const filteredClients = $derived(
    data.clients.filter((client) => {
      if (filter === "wired" && client.isWireless) return false;
      if (filter === "wireless" && !client.isWireless) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return [
        client.macAddress,
        client.ipAddress,
        client.hostname,
        client.interfaceName,
        client.ssid,
        client.deviceName,
        client.deviceIdentity,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    }),
  );

  const clientRows = $derived(
    filteredClients.map((client): ClientRow => {
      return {
        ...client,
        deviceName: client.deviceName ?? client.deviceIdentity ?? "Unknown device",
        deviceHref: `/manage/${data.site.id}/devices/${client.deviceId}`,
      };
    }),
  );

  const columns = [
    { key: "macAddress", label: "MAC", width: "160px", className: "col-mac" },
    { key: "ipAddress", label: "IP Address", width: "130px", className: "col-ip" },
    { key: "hostname", label: "Hostname", className: "col-hostname" },
    { key: "deviceName", label: "Device", className: "col-device" },
    { key: "interfaceName", label: "Interface", width: "120px", className: "col-interface hide-mobile" },
    { key: "type", label: "Type", width: "150px", className: "col-type" },
    { key: "lastSeenAt", label: "Last seen", width: "120px", className: "col-last-seen hide-mobile" },
  ];

  function asClientRow(row: Record<string, unknown>) {
    return row as ClientRow;
  }

  function formatFallback(value: string | null | undefined) {
    return value?.trim() ? value : "-";
  }

  function formatMac(value: string) {
    return value.toUpperCase();
  }

  function relativeTime(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const diffMs = Date.now() - d.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 60) return "just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  }
</script>

{#snippet tableActions()}
  <div class="table-actions">
    <Input
      compact
      type="search"
      name="clientSearch"
      placeholder="Search MAC, IP, hostname..."
      bind:value={search}
    />
  </div>
{/snippet}

{#snippet clientCell({
  row,
  column,
}: {
  row: Record<string, unknown>;
  column: { key: string };
})}
  {@const client = asClientRow(row)}
  {#if column.key === "macAddress"}
    <code>{formatMac(client.macAddress)}</code>
  {:else if column.key === "ipAddress"}
    {formatFallback(client.ipAddress)}
  {:else if column.key === "hostname"}
    {formatFallback(client.hostname)}
  {:else if column.key === "deviceName"}
    <a href={client.deviceHref}>{client.deviceName}</a>
  {:else if column.key === "interfaceName"}
    {formatFallback(client.interfaceName)}
  {:else if column.key === "type"}
    {#if client.isWireless}
      <span class="client-type">
        <Tag variant="info" size="sm" label="Wireless" />
        {#if client.ssid}
          <span class="muted">{client.ssid}</span>
        {/if}
        {#if client.signalStrength != null}
          <span class="muted">{client.signalStrength} dBm</span>
        {/if}
      </span>
    {:else}
      <Tag variant="default" size="sm" label="Wired" />
    {/if}
  {:else if column.key === "lastSeenAt"}
    <span class="muted">{relativeTime(client.lastSeenAt)}</span>
  {/if}
{/snippet}

<Page>
  <PageHeader
    title="Clients"
    subtitle={`${data.clients.length} active client${data.clients.length !== 1 ? "s" : ""} across ${data.siteDevices.length} device${data.siteDevices.length !== 1 ? "s" : ""}`}
  />

  <div class="client-stats">
    <StatCard label="Active clients" value={data.clients.length} />
    <StatCard label="Wired" value={wiredCount} />
    <StatCard label="Wireless" value={wirelessCount} />
    <StatCard label="Reporting devices" value={reportingDeviceCount} sub={`${data.siteDevices.length} adopted`} />
  </div>

  <Tabs
    tabs={filterTabs}
    activeTab={filter}
    variant="pills"
    ariaLabel="Client type filters"
    onTabChange={(id) => (filter = id as Filter)}
  />

  {#if data.clients.length === 0}
    <Card>
      <EmptyState
        icon="crosshair"
        title="No clients yet"
        description="Clients appear automatically once devices start reporting DHCP leases and ARP entries."
      />
    </Card>
  {:else}
    <Card
      title="Client inventory"
      description={`${clientRows.length} matching client${clientRows.length !== 1 ? "s" : ""}`}
      actions={tableActions}
    >
      <DataTable
        class="clients-table"
        {columns}
        data={clientRows}
        emptyMessage="No clients match your filters."
        cell={clientCell}
      />
    </Card>
  {/if}
</Page>

<style lang="scss">
  .client-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .table-actions {
    width: min(280px, 48vw);
  }

  .client-type {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  .muted {
    color: var(--color-muted);
  }

  :global(.clients-table) {
    min-width: 840px;
  }

  :global(.clients-table th),
  :global(.clients-table td) {
    height: 42px;
    white-space: nowrap;
    vertical-align: middle;
  }

  :global(.clients-table .col-hostname),
  :global(.clients-table .col-device) {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.clients-table code) {
    font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
  }

  :global(.clients-table a) {
    color: var(--color-brand);
    text-decoration: none;
    font-weight: 650;
  }

  :global(.clients-table a:hover) {
    text-decoration: underline;
  }

  @media (max-width: 900px) {
    .client-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .client-stats {
      grid-template-columns: 1fr;
    }

    .table-actions {
      width: 100%;
    }

    :global(.clients-table) {
      min-width: 560px;
    }

    :global(.clients-table .hide-mobile) {
      display: none;
    }
  }
</style>
