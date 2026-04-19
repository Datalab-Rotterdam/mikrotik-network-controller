<div class="page-title">
	<div>
		<h1>Settings</h1>
		<p>Controller security, local operation, and access management.</p>
	</div>
</div>

<section class="summary-grid">
	<div class="metric-card">
		<span>Authentication</span>
		<strong>Local</strong>
	</div>
	<div class="metric-card">
		<span>RBAC</span>
		<strong>Ready</strong>
	</div>
	<div class="metric-card">
		<span>MFA</span>
		<strong>Planned</strong>
	</div>
	<div class="metric-card">
		<span>Storage</span>
		<strong>Local</strong>
	</div>
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

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.metric-card {
		border: 1px solid #d7e0e4;
		border-radius: 8px;
		padding: 18px;
		background: var(--color-surface);
	}

	.metric-card span {
		color: #65737b;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.metric-card strong {
		display: block;
		margin-top: 10px;
		font-size: 30px;
	}

	@media (max-width: 900px) {
		.summary-grid {
			grid-template-columns: 1fr;
		}

		.page-title {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
