<div class="page-title">
	<div>
		<h1>Syslog</h1>
		<p>Local log ingestion and search for MikroTik devices.</p>
	</div>
</div>

<section class="panel">
	<h2>Events</h2>
	<div class="empty-state">Syslog ingestion is not enabled yet.</div>
</section>

<style>
	.page-title {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}

	h1 {
		margin: 0;
		font-size: 28px;
		line-height: 1.15;
	}

	p {
		margin: 8px 0 0;
		color: var(--color-muted);
		line-height: 1.5;
	}

	.panel {
		border: 1px solid #d7e0e4;
		border-radius: 8px;
		padding: 18px;
		background: var(--color-surface);
	}

	h2 {
		margin: 0 0 14px;
		font-size: 18px;
	}

	.empty-state {
		display: grid;
		place-items: center;
		min-height: 180px;
		border: 1px dashed #b8c5ca;
		border-radius: 8px;
		color: #65737b;
		text-align: center;
	}

	@media (max-width: 900px) {
		.page-title {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
