<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import favicon from "$lib/assets/favicon.svg";
  import { DataTable, Tag, Input, SectionLabel } from "$lib/client/components/primitives";
  import { ContentGrid } from "$lib/client/components/layout";
  import { StatCard, Donut } from "$lib/client/components/ui";
  import Button from "$lib/client/components/primitives/Button.svelte";

  let { data } = $props();

  let searchInput = $state(data.q ?? "");
  let searchTimer: ReturnType<typeof setTimeout>;

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const params = new URLSearchParams(page.url.searchParams);
      if (searchInput.trim().length >= 2) {
        params.set("q", searchInput.trim());
      } else {
        params.delete("q");
      }
      goto(`?${params}`, { replaceState: true, keepFocus: true });
    }, 300);
  }

  function totalDevices() {
    return data.sites.reduce((s, r) => s + r.deviceTotal, 0);
  }
  function totalOnline() {
    return data.sites.reduce((s, r) => s + r.deviceOnline, 0);
  }
  function totalClients() {
    return data.sites.reduce((s, r) => s + r.activeClients, 0);
  }
  function totalAlerts() {
    return data.sites.reduce((s, r) => s + r.openAlerts, 0);
  }

  function healthColor(site: (typeof data.sites)[number]) {
    if (site.openAlerts > 0) return "danger";
    if (site.deviceOffline > 0) return "warning";
    return "success";
  }

  function formatMac(s: string) {
    return s.toUpperCase();
  }
</script>

<svelte:head><title>Overview — MikroTik Controller</title></svelte:head>

<div class="exec-page">
  <header class="exec-header">
    <a class="logo-link" href="/manage">
      <img src={favicon} alt="MikroTik Controller" width="28" height="30" />
      <span>Network Controller</span>
    </a>
    <div class="header-right">
      <form method="POST" action="/manage/account/logout">
        <Button type="submit" variant="ghost">Sign out</Button>
      </form>
    </div>
  </header>

  <div class="exec-body">
    <ContentGrid class="org-totals">
      <StatCard label="Sites" value={data.sites.length} />
      <StatCard label="Total devices" value={totalDevices()} />
      <StatCard label="Online" value={totalOnline()} sub={`${totalDevices() - totalOnline()} offline`} />
      <StatCard label="Offline" value={totalDevices() - totalOnline()} trend={{ up: totalDevices() - totalOnline() === 0, label: totalDevices() - totalOnline() === 0 ? 'All good' : 'Devices offline' }} />
      <StatCard label="Active clients" value={totalClients()} />
      <StatCard label="Open alerts" value={totalAlerts()} trend={{ up: totalAlerts() === 0, label: totalAlerts() === 0 ? 'Clean' : `${totalAlerts()} pending` }} />
    </ContentGrid>

    <div class="section">
      <SectionLabel>Sites</SectionLabel>
      <div class="section">
        <table class="sites-table">
          <thead>
            <tr>
              <th>Site</th>
              <th>Location</th>
              <th>Devices</th>
              <th>Online</th>
              <th>Offline</th>
              <th>Clients</th>
              <th>Open alerts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {#each data.sites as site}
              <tr>
                <td>
                  <div class="site-name-cell">
                    <span class="health-dot {healthColor(site)}"></span>
                    <strong>{site.name}</strong>
                  </div>
                </td>
                <td class="muted">{site.location ?? "—"}</td>
                <td>{site.deviceTotal}</td>
                <td><Tag variant="success" label={String(site.deviceOnline)} /></td>
                <td>
                  {#if site.deviceOffline > 0}
                    <Tag variant="warning" label={String(site.deviceOffline)} />
                  {:else}
                    <span class="muted">0</span>
                  {/if}
                </td>
                <td>{site.activeClients}</td>
                <td>
                  {#if site.openAlerts > 0}
                    <Tag variant="danger" label={String(site.openAlerts)} />
                  {:else}
                    <span class="muted">0</span>
                  {/if}
                </td>
                <td class="actions-cell">
                  <a href="/manage/{site.id}" class="goto-btn">Open</a>
                </td>
              </tr>
            {:else}
              <tr><td colspan="8" class="empty-row">No sites configured.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="search-header">
        <SectionLabel>Client search</SectionLabel>
        <div class="search-input-wrapper">
          <Input
            name="clientSearch"
            type="search"
            placeholder="Search by MAC, IP, or hostname…"
            bind:value={searchInput}
            oninput={onSearchInput}
          />
        </div>
      </div>

      {#if data.q && data.q.length >= 2}
        {#if data.clientResults.length > 0}
          <table class="clients-table">
            <thead>
              <tr>
                <th>MAC</th>
                <th>IP</th>
                <th>Hostname</th>
                <th>Site</th>
                <th>Device</th>
                <th>Interface</th>
                <th>Type</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {#each data.clientResults as c}
                <tr>
                  <td><code class="mac">{formatMac(c.macAddress)}</code></td>
                  <td>{c.ipAddress ?? "—"}</td>
                  <td>{c.hostname ?? "—"}</td>
                  <td>
                    {#if c.siteId}
                      <a href="/manage/{c.siteId}/clients" class="site-link">{c.siteName ?? c.siteId}</a>
                    {:else}
                      <span class="muted">—</span>
                    {/if}
                  </td>
                  <td>
                    {#if c.siteId && c.deviceId}
                      <a href="/manage/{c.siteId}/devices/{c.deviceId}" class="site-link">{c.deviceName ?? c.deviceId}</a>
                    {:else}
                      <span class="muted">{c.deviceName ?? "—"}</span>
                    {/if}
                  </td>
                  <td class="muted">{c.interfaceName ?? "—"}</td>
                  <td>
                    {#if c.isWireless}
                      <Tag variant="info" size="sm" label="Wireless" />
                    {:else}
                      <Tag variant="default" size="sm" label="Wired" />
                    {/if}
                  </td>
                  <td class="muted">{new Date(c.lastSeenAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="no-results">
            No clients matching <strong>{data.q}</strong>.
          </p>
        {/if}
      {:else}
        <p class="search-hint">
          Enter at least 2 characters to search across all sites.
        </p>
      {/if}
  </div>
  </div>
</div>

<style lang="scss">
  .exec-page {
    display: grid;
    grid-template-rows: auto 1fr;
    min-height: 100vh;
    background: var(--color-page);
  }

  .exec-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 52px;
    padding: 0 24px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .logo-link {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--color-text);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .exec-body {
    display: grid;
    gap: 28px;
    max-width: 1200px;
    margin: 0 auto;
    padding: 28px 24px;
    width: 100%;
  }

  .org-totals {
    // ContentGrid handles gap; StatCard handles inner layout
  }

  .section {
    display: grid;
    gap: 12px;
  }

  .search-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .search-input {
    width: 320px;
  }

  .site-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .health-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &.success {
      background: var(--color-success);
    }
    &.warning {
      background: var(--color-warning);
    }
    &.danger {
      background: var(--color-danger);
    }
  }

  .muted {
    color: var(--color-muted);
  }

  .actions-cell {
    text-align: right;
  }

  .goto-btn {
    display: inline-flex;
    align-items: center;
    height: 28px;
    border: 1px solid var(--color-brand);
    border-radius: 4px;
    padding: 0 10px;
    color: var(--color-brand);
    background: transparent;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;

    &:hover {
      background: color-mix(in srgb, var(--color-brand) 8%, transparent);
    }
  }

  .mac {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    color: var(--color-text);
  }

  .site-link {
    color: var(--color-brand);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .no-results,
  .search-hint {
    color: var(--color-muted);
    font-size: 13px;
    text-align: center;
    padding: 20px 0;
    margin: 0;
  }
</style>
