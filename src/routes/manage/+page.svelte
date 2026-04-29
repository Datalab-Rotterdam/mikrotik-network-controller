<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { data } = $props();

	let searchInput = $state(data.q ?? '');
	let searchTimer: ReturnType<typeof setTimeout>;

	function onSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			const params = new URLSearchParams(page.url.searchParams);
			if (searchInput.trim().length >= 2) {
				params.set('q', searchInput.trim());
			} else {
				params.delete('q');
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
		if (site.openAlerts > 0) return 'danger';
		if (site.deviceOffline > 0) return 'warning';
		return 'success';
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
				<button type="submit" class="logout-link">Sign out</button>
			</form>
		</div>
	</header>

	<div class="exec-body">
		<div class="org-totals">
			<div class="total-card">
				<span class="total-label">Sites</span>
				<span class="total-value">{data.sites.length}</span>
			</div>
			<div class="total-card">
				<span class="total-label">Total devices</span>
				<span class="total-value">{totalDevices()}</span>
			</div>
			<div class="total-card success">
				<span class="total-label">Online</span>
				<span class="total-value">{totalOnline()}</span>
			</div>
			<div class="total-card {totalDevices() - totalOnline() > 0 ? 'warning' : ''}">
				<span class="total-label">Offline</span>
				<span class="total-value">{totalDevices() - totalOnline()}</span>
			</div>
			<div class="total-card">
				<span class="total-label">Active clients</span>
				<span class="total-value">{totalClients()}</span>
			</div>
			<div class="total-card {totalAlerts() > 0 ? 'danger' : ''}">
				<span class="total-label">Open alerts</span>
				<span class="total-value">{totalAlerts()}</span>
			</div>
		</div>

		<div class="section">
			<h2 class="section-title">Sites</h2>
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
							<td class="muted">{site.location ?? '—'}</td>
							<td>{site.deviceTotal}</td>
							<td><span class="count-pill success">{site.deviceOnline}</span></td>
							<td>
								{#if site.deviceOffline > 0}
									<span class="count-pill warning">{site.deviceOffline}</span>
								{:else}
									<span class="muted">0</span>
								{/if}
							</td>
							<td>{site.activeClients}</td>
							<td>
								{#if site.openAlerts > 0}
									<span class="count-pill danger">{site.openAlerts}</span>
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

		<div class="section">
			<div class="search-header">
				<h2 class="section-title">Client search</h2>
				<input
					class="search-input"
					type="search"
					placeholder="Search by MAC, IP, or hostname…"
					bind:value={searchInput}
					oninput={onSearchInput}
				/>
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
									<td>{c.ipAddress ?? '—'}</td>
									<td>{c.hostname ?? '—'}</td>
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
											<span class="muted">{c.deviceName ?? '—'}</span>
										{/if}
									</td>
									<td class="muted">{c.interfaceName ?? '—'}</td>
									<td>
										{#if c.isWireless}
											<span class="type-pill wireless">Wireless</span>
										{:else}
											<span class="type-pill wired">Wired</span>
										{/if}
									</td>
									<td class="muted">{new Date(c.lastSeenAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="no-results">No clients matching <strong>{data.q}</strong>.</p>
				{/if}
			{:else}
				<p class="search-hint">Enter at least 2 characters to search across all sites.</p>
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

	.logout-link {
		border: none;
		padding: 0;
		background: none;
		color: var(--color-muted);
		font-size: 13px;
		cursor: pointer;

		&:hover {
			color: var(--color-text);
		}
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
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
	}

	.total-card {
		display: grid;
		gap: 4px;
		padding: 14px 16px;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);

		&.success {
			border-color: color-mix(in srgb, var(--color-success) 30%, transparent);
			background: color-mix(in srgb, var(--color-success) 5%, var(--color-surface));
		}

		&.warning {
			border-color: color-mix(in srgb, var(--color-warning) 30%, transparent);
			background: color-mix(in srgb, var(--color-warning) 5%, var(--color-surface));
		}

		&.danger {
			border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
			background: color-mix(in srgb, var(--color-danger) 5%, var(--color-surface));
		}
	}

	.total-label {
		color: var(--color-muted);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.total-value {
		color: var(--color-text);
		font-size: 28px;
		font-weight: 700;
		line-height: 1;
	}

	.section {
		display: grid;
		gap: 12px;
	}

	.section-title {
		margin: 0;
		color: var(--color-text);
		font-size: 14px;
		font-weight: 700;
	}

	.search-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	.search-input {
		width: 320px;
		height: 34px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-text);
		background: var(--color-surface);
		font-size: 13px;
		outline: none;

		&:focus {
			border-color: var(--color-brand);
		}
	}

	.sites-table,
	.clients-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;

		th,
		td {
			height: 44px;
			border-bottom: 1px solid var(--color-border);
			padding: 0 14px;
			color: var(--color-text);
			text-align: left;
		}

		th {
			color: var(--color-muted);
			font-size: 12px;
			font-weight: 700;
			background: var(--color-surface);
		}

		td {
			background: var(--color-page);
		}

		tr:last-child td {
			border-bottom: 0;
		}

		tr:hover td {
			background: color-mix(in srgb, var(--color-brand) 3%, var(--color-page));
		}
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

		&.success { background: var(--color-success); }
		&.warning { background: var(--color-warning); }
		&.danger { background: var(--color-danger); }
	}

	.muted {
		color: var(--color-muted);
	}

	.count-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 999px;
		padding: 0 8px;
		font-size: 11px;
		font-weight: 700;

		&.success {
			color: var(--color-success);
			background: color-mix(in srgb, var(--color-success) 12%, transparent);
		}
		&.warning {
			color: var(--color-warning);
			background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		}
		&.danger {
			color: var(--color-danger);
			background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		}
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

	.type-pill {
		display: inline-flex;
		align-items: center;
		height: 18px;
		border-radius: 3px;
		padding: 0 6px;
		font-size: 10px;
		font-weight: 700;

		&.wireless {
			color: var(--color-brand);
			background: color-mix(in srgb, var(--color-brand) 10%, transparent);
		}

		&.wired {
			color: var(--color-muted);
			background: color-mix(in srgb, var(--color-muted) 10%, transparent);
		}
	}

	.empty-row,
	.no-results,
	.search-hint {
		color: var(--color-muted);
		font-size: 13px;
		text-align: center;
		padding: 20px 0;
		margin: 0;
	}

	.empty-row {
		height: 60px;
		vertical-align: middle;
	}
</style>
