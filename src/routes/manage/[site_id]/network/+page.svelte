<script lang="ts">
  import TabLayout from "$lib/client/components/layout/TabLayout.svelte";
  import { page } from "$app/state";

  type NetworkTab = "firewall" | "vlans";
  type TabItem<T extends string = string> = { id: T; label: string; icon?: string };

  let { data } = $props();

  const tabs: TabItem<NetworkTab>[] = [
    {
      id: "firewall",
      label: "Firewall",
      icon: "M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm0 2.2 7 3.1V11c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6.3l7-3.1Z",
    },
    {
      id: "vlans",
      label: "VLANs",
      icon: "M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z",
    },
  ];

  const validTabIds = new Set<NetworkTab>(tabs.map((t) => t.id));
  const activeTab = $derived(
    validTabIds.has(page.url.searchParams.get("tab") as NetworkTab)
      ? (page.url.searchParams.get("tab") as NetworkTab)
      : "firewall",
  );

  const basePath = $derived(page.url.pathname.replace("/network", ""));

  let deviceFilter = $state("");

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

  function tabHref(tabId: NetworkTab) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set("tab", tabId);
    return `${page.url.pathname}?${params.toString()}`;
  }
</script>

<section class="network-page">
  <div class="page-header">
    <div>
      <h1>Network</h1>
      <p>{data.devices.length} devices · {data.firewallRules.length} firewall rules · {data.vlans.length} VLANs</p>
    </div>
    <div class="header-filter">
      <label for="device-filter" class="filter-label">Filter by device</label>
      <select
        id="device-filter"
        class="device-select"
        bind:value={deviceFilter}
      >
        <option value="">All devices</option>
        {#each data.devices as device}
          <option value={device.id}>{device.identity ?? device.name}</option>
        {/each}
      </select>
    </div>
  </div>

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
                    <td><span class="chain-badge chain-{rule.chain}">{rule.chain}</span></td>
                    <td><span class="action-badge action-{rule.action}">{rule.action}</span></td>
                    <td class="mono-cell">{rule.srcAddress || rule.inInterface || "—"}</td>
                    <td class="mono-cell">{rule.dstAddress || rule.outInterface || "—"}</td>
                    <td>{rule.protocol || "any"}</td>
                    <td class="comment-cell">{rule.comment || "—"}</td>
                    <td>
                      {#if rule.disabled}
                        <span class="status-pill">Disabled</span>
                      {:else}
                        <span class="status-pill status-success">Active</span>
                      {/if}
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
    {/if}
  </TabLayout>
</section>

<style lang="scss">
  .network-page {
    display: grid;
    gap: 14px;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }

  h1 {
    margin: 0;
    color: #30373d;
    font-size: 20px;
    font-weight: 650;
  }

  .page-header p {
    margin: 4px 0 0;
    color: #8a949c;
    font-size: 13px;
  }

  .header-filter {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .filter-label {
    color: #8a949c;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .device-select {
    height: 34px;
    min-width: 180px;
    border: 1px solid #dce4e9;
    border-radius: 4px;
    padding: 0 8px;
    color: #30373d;
    background: #fbfdff;
    font-size: 13px;
  }

  .content-section {
    display: grid;
    gap: 14px;
    border: 1px solid #eef1f3;
    border-radius: 6px;
    padding: 16px;
    background: var(--color-surface);
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

  .chain-badge,
  .action-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .chain-input { background: #e8f4fd; color: #1565c0; }
  .chain-forward { background: #e8f0fe; color: #3949ab; }
  .chain-output { background: #f3e8fd; color: #6a1b9a; }

  .action-accept { background: #e8f5e9; color: #2e7d32; }
  .action-drop { background: #fce4ec; color: #b71c1c; }
  .action-reject { background: #fff3e0; color: #e65100; }
  .action-log { background: #f3f4f6; color: #374151; }
  .action-jump,
  .action-return,
  .action-passthrough { background: #fafafa; color: #6b7280; }

  .disabled-row td {
    opacity: 0.45;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 999px;
    padding: 0 9px;
    background: #f1f4f6;
    color: #7d8790;
    font-size: 12px;
    font-weight: 800;
  }

  .status-success {
    color: #0d704f;
    background: #eaf8f1;
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 120px;
    color: #8a949c;
    font-size: 13px;
    text-align: center;
  }
</style>
