<script lang="ts">
	import WebSocket from '@sourceregistry/sveltekit-websockets/client';

	let { data, form } = $props();

	const formatDate = (value: Date | string | null) => {
		if (!value) {
			return 'Never';
		}

		return new Date(value).toLocaleString();
	};
</script>

<div class="page-title">
	<div>
		<h1>Adoption</h1>
		<p>Discover MikroTik devices and prepare read-only onboarding.</p>
	</div>
	<a class="button" href="#manual-adoption">Manual add</a>
</div>

<section class="grid-two">
	<div class="table-panel">
		<h2>Discovered neighbors</h2>
		<table class="data-table">
			<thead>
				<tr>
					<th>Device</th>
					<th>Address</th>
					<th>Platform</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				<WebSocket action="/adoption?">
					{#snippet message(neighbor)}
						<tr>
							<td>{neighbor.identity ?? neighbor.name ?? 'Unknown'}</td>
							<td>{neighbor.address ?? neighbor.ip ?? 'Unknown'}</td>
							<td>{neighbor.platform ?? 'MikroTik'}</td>
							<td><span class="status-pill">Discovered</span></td>
						</tr>
					{/snippet}
				</WebSocket>
			</tbody>
		</table>
	</div>

	<div class="panel" id="manual-adoption">
		<h2>Read-only adoption</h2>
		<form class="form-stack" method="POST" action="?/adopt">
			{#if form?.message}
				<div class={form?.success ? 'status-success' : 'error-message'}>{form.message}</div>
			{/if}

			<label class="field">
				<span>Provider</span>
				<select name="provider">
					<option value="real" selected={(form?.provider ?? data.prefill.provider) !== 'mock'}>
						Real RouterOS API
					</option>
					<option value="mock" selected={(form?.provider ?? data.prefill.provider) === 'mock'}>
						Mock device
					</option>
				</select>
			</label>

			<label class="field">
				<span>Host</span>
				<input
					name="host"
					placeholder="192.168.88.1"
					value={form?.host ?? data.prefill.host}
					required
				/>
			</label>
			<label class="field">
				<span>API port</span>
				<input name="apiPort" inputmode="numeric" value={form?.apiPort ?? 8728} required />
			</label>
			<label class="field">
				<span>Site</span>
				<input
					name="siteName"
					list="site-list"
					value={form?.siteName ?? data.sites[0]?.name ?? 'Default'}
					required
				/>
				<datalist id="site-list">
					{#each data.sites as site}
						<option value={site.name}></option>
					{/each}
				</datalist>
			</label>
			<label class="field">
				<span>Username</span>
				<input name="username" autocomplete="username" value={form?.username ?? 'admin'} required />
			</label>
			<label class="field">
				<span>Password</span>
				<input name="password" type="password" autocomplete="current-password" required />
			</label>
			<label class="field">
				<span>Mode</span>
				<select name="mode">
					<option value="read_only">Read-only</option>
				</select>
			</label>
			<button class="button" type="submit">Adopt read-only</button>
		</form>
	</div>
</section>

<section class="grid-two">
	<div class="table-panel">
		<h2>Recent adoption attempts</h2>
		<table class="data-table">
			<thead>
				<tr>
					<th>Host</th>
					<th>User</th>
					<th>Status</th>
					<th>Started</th>
					<th>Error</th>
				</tr>
			</thead>
			<tbody>
				{#if data.attempts.length}
					{#each data.attempts as attempt}
						<tr>
							<td>{attempt.host}</td>
							<td>{attempt.username}</td>
							<td><span class="status-pill">{attempt.status}</span></td>
							<td>{formatDate(attempt.startedAt)}</td>
							<td>{attempt.errorMessage ?? ''}</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="5">No adoption attempts recorded yet.</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<div class="table-panel">
		<h2>Adopted devices</h2>
		<table class="data-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Host</th>
					<th>Status</th>
				</tr>
			</thead>
			<tbody>
				{#if data.devices.length}
					{#each data.devices as device}
						<tr>
							<td>{device.name}</td>
							<td>{device.host}</td>
							<td><span class="status-pill">{device.connectionStatus}</span></td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="3">No devices adopted yet.</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</section>
