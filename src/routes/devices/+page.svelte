<script lang="ts">
	let { data } = $props();

	const adoptedHosts = $derived(new Set(data.devices.map((device) => device.host)));
	const discoveredRows = $derived(
		data.discoveredDevices
			.filter((device) => device.address && !adoptedHosts.has(device.address))
			.map((device) => ({
				id: device.id,
				type: 'router',
				name: device.identity ?? 'Discovered MikroTik',
				application: 'Network',
				status: 'Discovered',
				macAddress: device.macAddress ?? '',
				model: device.hardware ?? device.platform ?? '',
				version: device.version ?? '',
				ipAddress: device.address ?? '',
				uplink: device.interfaceName ?? '',
				parentDevice: '',
				adopted: false
			}))
	);

	const adoptedRows = $derived(
		data.devices.map((device) => ({
			id: device.id,
			type: device.platform === 'switchos' ? 'switch' : 'router',
			name: device.identity ?? device.name,
			application: 'Network',
			status: device.connectionStatus,
			macAddress: '',
			model: device.model ?? '',
			version: device.routerOsVersion ?? '',
			ipAddress: device.host,
			uplink: '',
			parentDevice: '',
			adopted: true
		}))
	);

	const rows = $derived([...adoptedRows, ...discoveredRows]);
	const adoptedCount = $derived(adoptedRows.length);
	const discoveredCount = $derived(discoveredRows.length);
</script>

<section class="devices-page">
	<div class="devices-toolbar">
		<div class="toolbar-left">
			<input class="search-input" type="search" placeholder="Search" aria-label="Search devices" />
			<div class="tabs" aria-label="Device filters">
				<a href="/devices" aria-current="page">All ({rows.length})</a>
				<a href="/devices">WiFi (0)</a>
				<a href="/devices">Wired ({rows.length})</a>
				<a href="/devices">Adopted ({adoptedCount})</a>
				<a href="/devices">Discovered ({discoveredCount})</a>
			</div>
		</div>

		<a class="icon-button" href="/adoption" aria-label="Adopt device" title="Adopt device">
			<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
				<path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
			</svg>
		</a>
	</div>

	<div class="devices-table-wrap">
		<table class="devices-table">
			<thead>
				<tr>
					<th style="width: 78px;">Type</th>
					<th>Name</th>
					<th>Application</th>
					<th>Status</th>
					<th>MAC Address</th>
					<th>Model</th>
					<th>Version</th>
					<th>IP Address</th>
					<th>Uplink</th>
					<th>Parent Device</th>
					<th style="width: 110px;">Action</th>
				</tr>
			</thead>
			<tbody>
				{#if rows.length}
					{#each rows as device}
						<tr>
							<td>
								<span class="device-type-icon" title={device.type}>
									<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
										<path
											fill="currentColor"
											d={device.type === 'switch'
												? 'M4 6h16v10H4V6Zm2 2v6h12V8H6Zm-2 11h16v2H4v-2Z'
												: 'M12 4c4.4 0 8 1.6 8 3.5S16.4 11 12 11 4 9.4 4 7.5 7.6 4 12 4Zm-8 6.2c1.6 1.7 4.5 2.8 8 2.8s6.4-1.1 8-2.8V15c0 1.9-3.6 3.5-8 3.5S4 16.9 4 15v-4.8Z'}
										/>
									</svg>
								</span>
							</td>
							<td>{device.name}</td>
							<td>{device.application}</td>
							<td>{device.status}</td>
							<td>{device.macAddress}</td>
							<td>{device.model}</td>
							<td>{device.version}</td>
							<td>{device.ipAddress}</td>
							<td>{device.uplink}</td>
							<td>{device.parentDevice}</td>
							<td>
								{#if device.adopted}
									<span class="status-pill">Adopted</span>
								{:else}
									<a
										class="table-action"
										href={`/adoption?host=${encodeURIComponent(device.ipAddress)}&provider=real`}
									>
										Adopt
									</a>
								{/if}
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="11">
							<div class="empty-devices">
								<div>
									<div class="empty-devices-icon">
										<svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
											<path
												fill="currentColor"
												d="M4 6h11v8H4V6Zm2 2v4h7V8H6Zm11 1h3v7h-3V9ZM3 17h18v2H3v-2Z"
											/>
										</svg>
									</div>
									<strong>No MikroTik Devices Have Been Adopted</strong>
									<p>If devices are missing, make sure they are online and reachable from the controller.</p>
								</div>
							</div>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</section>
