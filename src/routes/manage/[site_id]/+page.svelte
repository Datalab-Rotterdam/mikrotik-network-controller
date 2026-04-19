<script lang="ts">
	let { data } = $props();

	const metrics = $derived([
		{ label: 'Devices', value: data.summary.deviceCount },
		{ label: 'Sites', value: data.summary.siteCount },
		{ label: 'Jobs', value: data.summary.jobCount },
		{ label: 'Alerts', value: 0 }
	]);
</script>

<div class="dashboard-toolbar">
	<div>
		<h1>Dashboard</h1>
		<p>Fleet health, adoption progress, and recent controller activity.</p>
	</div>
	<a class="icon-action" href={`/manage/${data.site.id}/devices?adopt=`} aria-label="Start adoption" title="Start adoption">
		<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
			<path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
		</svg>
	</a>
</div>

<section class="metric-row" aria-label="Network summary">
	{#each metrics as metric}
		<div class="metric-cell">
			<span>{metric.label}</span>
			<strong>{metric.value}</strong>
		</div>
	{/each}
</section>

<section class="dashboard-grid">
	<div class="dashboard-panel map-panel">
		<h2>Network map</h2>
		<div class="map-empty">
			<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true">
				<path
					fill="currentColor"
					d="M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm2.5-7 5.2 6.4 1.6-1.3L11.1 7.7 9.5 9Zm.5 9h4v-2h-4v2Z"
				/>
			</svg>
			<div>
				<strong>No adopted devices yet</strong>
				<p>Adopt a CHR or RouterOS device to start building topology and inventory.</p>
			</div>
		</div>
	</div>

	<div class="dashboard-panel">
		<div class="panel-title">
			<h2>Recent activity</h2>
			<span>{data.summary.recentAuditEvents.length}</span>
		</div>
		{#if data.summary.recentAuditEvents.length}
			<table class="activity-table">
				<thead>
					<tr>
						<th>Action</th>
						<th>Message</th>
						<th>Time</th>
					</tr>
				</thead>
				<tbody>
					{#each data.summary.recentAuditEvents as event}
						<tr>
							<td>{event.action}</td>
							<td>{event.message ?? 'Controller event'}</td>
							<td>{event.createdAt.toLocaleString()}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<div class="activity-empty">No audit events recorded yet.</div>
		{/if}
	</div>
</section>

<style lang="scss">
	.dashboard-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 50px;
		margin: -18px -14px 18px;
		padding: 0 18px;
		border-bottom: 1px solid #eef1f3;
		background: var(--color-surface);
	}

	h1 {
		margin: 0;
		color: #6f7780;
		font-size: 20px;
		font-weight: 500;
		line-height: 1.2;
	}

	p {
		margin: 3px 0 0;
		color: var(--color-muted);
		font-size: 13px;
		line-height: 1.4;
	}

	.icon-action {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid #dce4e9;
		border-radius: 4px;
		color: var(--color-link);
		background: #fbfdff;
		cursor: pointer;

		&:hover {
			border-color: var(--color-link);
			background: #eef6ff;
		}
	}

	.metric-row {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		margin-bottom: 14px;
		border: 1px solid #eef1f3;
		border-radius: 4px;
		background: var(--color-surface);
		overflow: hidden;
	}

	.metric-cell {
		display: grid;
		gap: 6px;
		min-height: 72px;
		padding: 14px 16px;
		border-right: 1px solid #eef1f3;

		&:last-child {
			border-right: 0;
		}

		span {
			color: #7d8790;
			font-size: 12px;
			font-weight: 700;
			text-transform: uppercase;
		}

		strong {
			color: #2f3438;
			font-size: 26px;
			line-height: 1;
		}
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
		gap: 14px;
	}

	.dashboard-panel {
		min-width: 0;
		border: 1px solid #eef1f3;
		border-radius: 4px;
		background: var(--color-surface);
		overflow: hidden;

		h2 {
			margin: 0;
			padding: 14px 16px;
			border-bottom: 1px solid #eef1f3;
			color: #2f3438;
			font-size: 14px;
			font-weight: 800;
		}
	}

	.map-empty,
	.activity-empty {
		display: grid;
		place-items: center;
		min-height: 320px;
		color: #65737b;
		text-align: center;
	}

	.map-empty {
		gap: 12px;
		color: #c8dff7;

		strong {
			display: block;
			margin-bottom: 8px;
			color: #50575d;
		}

		p {
			max-width: 390px;
			margin: 0;
		}
	}

	.panel-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		border-bottom: 1px solid #eef1f3;

		h2 {
			border-bottom: 0;
		}

		span {
			margin-right: 16px;
			color: #7d8790;
			font-size: 12px;
			font-weight: 800;
		}
	}

	.activity-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;

		th,
		td {
			height: 42px;
			padding: 0 14px;
			border-bottom: 1px solid #f0f2f4;
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
	}

	@media (max-width: 900px) {
		.metric-row,
		.dashboard-grid {
			grid-template-columns: 1fr;
		}

		.metric-cell {
			border-right: 0;
			border-bottom: 1px solid #eef1f3;

			&:last-child {
				border-bottom: 0;
			}
		}

		.dashboard-toolbar {
			align-items: flex-start;
			padding: 12px 18px;
			flex-direction: column;
		}
	}
</style>
