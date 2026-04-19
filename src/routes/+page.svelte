<script lang="ts">
	let { data } = $props();
</script>

<div class="page-title">
	<div>
		<h1>Dashboard</h1>
		<p>Fleet health, adoption progress, and recent controller activity.</p>
	</div>
	<a class="button" href="/adoption">Start adoption</a>
</div>

<section class="summary-grid" aria-label="Network summary">
	<div class="metric-card">
		<span>Devices</span>
		<strong>{data.summary.deviceCount}</strong>
	</div>
	<div class="metric-card">
		<span>Sites</span>
		<strong>{data.summary.siteCount}</strong>
	</div>
	<div class="metric-card">
		<span>Jobs</span>
		<strong>{data.summary.jobCount}</strong>
	</div>
	<div class="metric-card">
		<span>Alerts</span>
		<strong>0</strong>
	</div>
</section>

<section class="grid-two">
	<div class="panel">
		<h2>Network map</h2>
		<div class="empty-state">
			<div>
				<strong>No adopted devices yet</strong>
				<p>Adopt a CHR or RouterOS device to start building topology and inventory.</p>
			</div>
		</div>
	</div>
	<div class="panel">
		<h2>Recent activity</h2>
		{#if data.summary.recentAuditEvents.length}
			<div class="event-list">
				{#each data.summary.recentAuditEvents as event}
					<div class="event-row">
						<strong>{event.action}</strong>
						<span>{event.message ?? 'Controller event'} · {event.createdAt.toLocaleString()}</span>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">No audit events recorded yet.</div>
		{/if}
	</div>
</section>
