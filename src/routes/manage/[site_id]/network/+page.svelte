<script lang="ts">
  import { enhance } from "$app/forms";
  import { page } from "$app/state";
  import { Page, PageHeader, TabLayout } from "$lib/client/components/layout";
  import { Alert, Button, Card, EnumBadge, Input, StatusPill } from "$lib/client/components/primitives";
  import type { IconName } from "$lib/client/components/primitives/icons";

  type NetworkTab = "firewall" | "vlans" | "tunnels";
  type TabItem<T extends string = string> = { id: T; label: string; icon?: IconName };

  let { data, form } = $props();

  const tabs: TabItem<NetworkTab>[] = [
    { id: "firewall", label: "Firewall", icon: "shield" },
    { id: "vlans", label: "VLANs", icon: "lines" },
    { id: "tunnels", label: "Tunnels", icon: "topology" },
  ];

  const validTabIds = new Set<NetworkTab>(tabs.map((t) => t.id));
  const activeTab = $derived(
    validTabIds.has(page.url.searchParams.get("tab") as NetworkTab)
      ? (page.url.searchParams.get("tab") as NetworkTab)
      : "firewall",
  );

  const basePath = $derived(page.url.pathname.replace("/network", ""));

  let deviceFilter = $state("");
  let showCreateTunnel = $state(false);
  let selectedRemoteSiteId = $state("");

  const filteredFirewall = $derived(
    deviceFilter
      ? data.firewallRules.filter((r) => r.deviceId === deviceFilter)
      : data.firewallRules,
  );

  const filteredVlans = $derived(
    deviceFilter
      ? data.vlans.filter((v) => v.deviceId === deviceFilter)
      : data.vlans,
  );

  const remoteDevicesForSite = $derived(
    selectedRemoteSiteId
      ? (data.devicesBySite.find((s) => s.siteId === selectedRemoteSiteId)?.devices ?? [])
      : [],
  );

  function tabHref(tabId: NetworkTab) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set("tab", tabId);
    return `${page.url.pathname}?${params.toString()}`;
  }

  function formatBytes(n: number | null | undefined): string {
    if (n == null) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }
</script>

{#snippet networkActions()}
  <div class="header-filter">
    <label for="device-filter" class="filter-label">Filter by device</label>
    <select
      id="device-filter"
      class="device-select"
      bind:value={deviceFilter}
    >
      <option value="">All devices</option>
      {#each data.devices as device}
        <option value={device.id}>{device.name ?? device.identity}</option>
      {/each}
    </select>
  </div>
{/snippet}

<Page>
  <PageHeader
    title="Network"
    subtitle={`${data.devices.length} devices · ${data.firewallRules.length} firewall rules · ${data.vlans.length} VLANs · ${data.tunnels.length} tunnels`}
    actions={networkActions}
  />

  {#if form?.tunnelError}
    <Alert variant="error">{form.tunnelError}</Alert>
  {/if}
  {#if form?.tunnelCreated}
    <Alert variant="success">Tunnel "{form.tunnelName}" is being provisioned. Check Jobs for progress.</Alert>
  {/if}

  <TabLayout {tabs} {activeTab} getHref={tabHref} ariaLabel="Network sections">
    {#if activeTab === "firewall"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Firewall Rules</h2>
          <span>{filteredFirewall.length} rules</span>
        </div>
        {#if filteredFirewall.length === 0}
          <div class="empty-state">
            No firewall rules found.
            {deviceFilter ? "Try clearing the device filter." : "Rules sync during the next monitoring tick."}
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Device</th>
                  <th>Chain</th>
                  <th>Action</th>
                  <th>Src</th>
                  <th>Dst</th>
                  <th>Protocol</th>
                  <th>Comment</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredFirewall as rule, i}
                  <tr class:disabled-row={rule.disabled}>
                    <td class="mono-cell">{i + 1}</td>
                    <td class="device-cell">
                      <a href={`${basePath}/devices/${rule.deviceId}?tab=firewall`}>
                        {data.deviceMap[rule.deviceId] ?? rule.deviceId}
                      </a>
                    </td>
                    <td><EnumBadge value={rule.chain} preset="chain" /></td>
                    <td><EnumBadge value={rule.action} preset="action" /></td>
                    <td class="mono-cell">{rule.srcAddress || rule.inInterface || "—"}</td>
                    <td class="mono-cell">{rule.dstAddress || rule.outInterface || "—"}</td>
                    <td>{rule.protocol || "any"}</td>
                    <td class="comment-cell">{rule.comment || "—"}</td>
                    <td>
                      <StatusPill status={rule.disabled ? 'disabled' : 'active'} label={rule.disabled ? 'Disabled' : 'Active'} />
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeTab === "vlans"}
      <section class="content-section">
        <div class="section-heading">
          <h2>VLANs</h2>
          <span>{filteredVlans.length} configured</span>
        </div>
        {#if filteredVlans.length === 0}
          <div class="empty-state">
            No VLANs found.
            {deviceFilter ? "Try clearing the device filter." : "VLANs sync during the next monitoring tick."}
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>VLAN ID</th>
                  <th>Device</th>
                  <th>Name</th>
                  <th>Interface</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {#each filteredVlans as vlan}
                  <tr>
                    <td class="mono-cell">{vlan.vlanId}</td>
                    <td class="device-cell">
                      <a href={`${basePath}/devices/${vlan.deviceId}?tab=vlans`}>
                        {data.deviceMap[vlan.deviceId] ?? vlan.deviceId}
                      </a>
                    </td>
                    <td>{vlan.name}</td>
                    <td class="mono-cell">{vlan.interfaceName || "—"}</td>
                    <td class="comment-cell">{vlan.comment || "—"}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeTab === "tunnels"}
      <div class="tunnels-layout">
        <!-- Controller-managed tunnels -->
        <section class="content-section">
          <div class="section-heading">
            <h2>Site-to-Site Tunnels</h2>
            <Button
              variant="secondary"
              size="sm"
              onclick={() => (showCreateTunnel = !showCreateTunnel)}
            >
              {showCreateTunnel ? "Cancel" : "+ New tunnel"}
            </Button>
          </div>

          <!-- Device readiness checklist -->
          {#if data.devices.length > 0}
            <div class="readiness-grid">
              {#each data.devices as d}
                {@const isOnline = d.connectionStatus === 'online'}
                {@const isManaged = d.adoptionMode === 'managed'}
                {@const hasPublicIp = !!d.publicIp}
                {@const ready = isOnline && isManaged}
                <div class="readiness-card" class:ready class:warn={ready && !hasPublicIp}>
                  <div class="readiness-name">{d.name}</div>
                  <ul class="readiness-checks">
                    <li class:ok={isOnline} class:fail={!isOnline}>
                      {isOnline ? "✓" : "✗"} Online
                    </li>
                    <li class:ok={isManaged} class:fail={!isManaged}>
                      {isManaged ? "✓" : "✗"} Managed mode
                    </li>
                    <li class:ok={hasPublicIp} class:warn-item={!hasPublicIp}>
                      {hasPublicIp ? `✓ Public IP (${d.publicIp})` : "⚠ No public IP — set in Advanced tab if behind NAT"}
                    </li>
                  </ul>
                </div>
              {/each}
            </div>
          {/if}

          {#if showCreateTunnel}
            <Card title="Create WireGuard tunnel">
              <form
                method="POST"
                action="?/createTunnel"
                use:enhance={() =>
                  async ({ update }) => {
                    await update();
                    showCreateTunnel = false;
                    selectedRemoteSiteId = "";
                  }}
              >
                <div class="form-grid">
                  <Input name="name" label="Tunnel name" required placeholder="e.g. site-a-to-b" />
                  <div class="field">
                    <label class="field-label" for="local-device">Local device (this site)</label>
                    <select id="local-device" name="localDeviceId" class="field-select" required>
                      <option value="">Select device</option>
                      {#each data.devices as d}
                        <option value={d.id}>{d.name}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label" for="remote-site">Remote site</label>
                    <select
                      id="remote-site"
                      name="remoteSiteId"
                      class="field-select"
                      required
                      bind:value={selectedRemoteSiteId}
                    >
                      <option value="">Select site</option>
                      {#each data.devicesBySite as s}
                        <option value={s.siteId}>{s.siteName}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="field">
                    <label class="field-label" for="remote-device">Remote device</label>
                    <select id="remote-device" name="remoteDeviceId" class="field-select" required>
                      <option value="">Select device</option>
                      {#each remoteDevicesForSite as d}
                        <option value={d.id}>{d.name}</option>
                      {/each}
                    </select>
                  </div>
                  <Input
                    name="localNetworkRange"
                    label="Local site network (CIDR)"
                    required
                    placeholder="192.168.1.0/24"
                  />
                  <Input
                    name="remoteNetworkRange"
                    label="Remote site network (CIDR)"
                    required
                    placeholder="192.168.2.0/24"
                  />
                </div>
                <p class="form-hint">Tunnel link IPs and WireGuard port are assigned automatically.</p>
                <div class="form-actions">
                  <Button type="submit">Provision tunnel</Button>
                </div>
              </form>
            </Card>
          {/if}

          {#if data.tunnels.length === 0 && !showCreateTunnel}
            <div class="empty-state">
              No managed tunnels. Create one above or configure tunnels directly on devices.
            </div>
          {:else if data.tunnels.length > 0}
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Local device</th>
                    <th>Remote device</th>
                    <th>Local range</th>
                    <th>Remote range</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.tunnels as tunnel}
                    <tr>
                      <td><strong>{tunnel.name}</strong></td>
                      <td class="mono-cell">{data.allDeviceMap[tunnel.localDeviceId] ?? tunnel.localDeviceId}</td>
                      <td class="mono-cell">{data.allDeviceMap[tunnel.remoteDeviceId] ?? tunnel.remoteDeviceId}</td>
                      <td class="mono-cell">{tunnel.localNetworkRange ?? "—"}</td>
                      <td class="mono-cell">{tunnel.remoteNetworkRange ?? "—"}</td>
                      <td>
                        <StatusPill
                          status={tunnel.status === 'active' ? 'active' : tunnel.status === 'error' ? 'danger' : 'queued'}
                          label={tunnel.status}
                        />
                      </td>
                      <td class="actions-cell">
                        {#if tunnel.status !== "removing" && tunnel.status !== "provisioning"}
                          <form
                            method="POST"
                            action="?/deleteTunnel"
                            use:enhance
                          >
                            <input type="hidden" name="tunnelId" value={tunnel.id} />
                            <Button
                              type="submit"
                              variant="danger"
                              size="sm"
                              onclick={(e: Event) => {
                                if (!confirm(`Remove tunnel "${tunnel.name}"? This will deprovision WireGuard on both devices.`))
                                  e.preventDefault();
                              }}
                            >Remove</Button>
                          </form>
                        {:else}
                          <span class="muted-text">{tunnel.status}…</span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>

        <!-- Discovered WireGuard interfaces -->
        {#if data.wgInterfaces.length > 0}
          <section class="content-section">
            <div class="section-heading">
              <h2>WireGuard Interfaces</h2>
              <span>{data.wgInterfaces.length} discovered</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Interface</th>
                    <th>Listen port</th>
                    <th>Public key</th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.wgInterfaces as iface}
                    <tr>
                      <td class="device-cell">
                        {data.deviceMap[iface.deviceId] ?? iface.deviceId}
                      </td>
                      <td class="mono-cell">{iface.name}</td>
                      <td class="mono-cell">{iface.listenPort ?? "—"}</td>
                      <td class="pubkey-cell mono-cell">{iface.publicKey ?? "—"}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>
        {/if}

        <!-- Discovered WireGuard peers -->
        {#if data.wgPeers.length > 0}
          <section class="content-section">
            <div class="section-heading">
              <h2>WireGuard Peers</h2>
              <span>{data.wgPeers.length} discovered</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Interface</th>
                    <th>Endpoint</th>
                    <th>Allowed</th>
                    <th>Last handshake</th>
                    <th>RX / TX</th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.wgPeers as peer}
                    <tr>
                      <td class="device-cell">
                        {data.deviceMap[peer.deviceId] ?? peer.deviceId}
                      </td>
                      <td class="mono-cell">{peer.interfaceName ?? "—"}</td>
                      <td class="mono-cell">
                        {peer.endpointAddress
                          ? `${peer.endpointAddress}:${peer.endpointPort ?? "?"}`
                          : "—"}
                      </td>
                      <td class="mono-cell">{peer.allowedAddresses ?? "—"}</td>
                      <td class="comment-cell">{peer.lastHandshake ?? "never"}</td>
                      <td class="mono-cell">
                        {formatBytes(peer.rxBytes)} / {formatBytes(peer.txBytes)}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </section>
        {/if}
      </div>
    {/if}
  </TabLayout>
</Page>

<style lang="scss">
  .content-section {
    display: grid;
    gap: 14px;
    border: 1px solid #eef1f3;
    border-radius: 6px;
    padding: 16px;
    background: var(--color-surface);
  }

  .tunnels-layout {
    display: grid;
    gap: 16px;
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  h2 {
    margin: 0;
    color: #30373d;
    font-size: 15px;
    font-weight: 800;
  }

  .section-heading span {
    color: #8a949c;
    font-size: 12px;
    font-weight: 700;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .field-label {
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 700;
  }

  .field-select {
    height: 36px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 0 10px;
    color: var(--color-text);
    background: var(--color-surface);
    font: inherit;
    font-size: 13px;

    &:focus {
      outline: 2px solid var(--color-brand);
      outline-offset: -1px;
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .form-hint {
    font-size: 12px;
    color: #8a949c;
    margin: 8px 0 0;
  }

  .readiness-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 4px;
  }

  .readiness-card {
    border: 1px solid var(--color-border, #eef1f3);
    border-radius: 6px;
    padding: 12px 14px;
    background: var(--color-surface);

    &.ready {
      border-color: #c3e6cb;
      background: #f6fff8;
    }

    &.warn {
      border-color: #ffe08a;
      background: #fffdf0;
    }
  }

  .readiness-name {
    font-size: 13px;
    font-weight: 700;
    color: #30373d;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .readiness-checks {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;

    li.ok { color: #2d7a3a; }
    li.fail { color: #9b3030; }
    li.warn-item { color: #8a6200; }
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    height: 42px;
    border-bottom: 1px solid #f0f2f4;
    padding: 0 12px;
    color: #323a40;
    font-size: 13px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th {
    color: #2f3438;
    font-weight: 800;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .mono-cell {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: #8a949c;
  }

  .pubkey-cell {
    max-width: 220px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-cell a {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  .comment-cell {
    color: #8a949c;
    font-size: 12px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions-cell {
    text-align: right;
    width: 100px;
  }

  .muted-text {
    color: var(--color-muted);
    font-size: 12px;
  }

  .disabled-row td {
    opacity: 0.45;
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 120px;
    color: #8a949c;
    font-size: 13px;
    text-align: center;
  }

  .header-filter {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    color: var(--color-muted);
    font-size: 12px;
    font-weight: 600;
  }

  .device-select {
    height: 30px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 0 8px;
    color: var(--color-text);
    background: var(--color-surface);
    font: inherit;
    font-size: 12px;
  }
</style>
