<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../primitives/Button.svelte';
	import ProgressBar from '../primitives/ProgressBar.svelte';
	import SectionLabel from '../primitives/SectionLabel.svelte';
	import StatusBadge from '../primitives/StatusBadge.svelte';
	import Tag from '../primitives/Tag.svelte';

	type Port = {
		key: string;
		name: string;
		label?: string;
		kind?: string;
		speed?: string;
		state?: 'active' | 'inactive' | 'disabled' | 'uncollected';
		interface?: {
			name: string;
			type?: string;
			comment?: string;
			running?: boolean;
			disabled?: boolean;
		};
	};

	type Metric = {
		rxBytes?: number;
		txBytes?: number;
		rxErrors?: number;
		txErrors?: number;
		rxDrops?: number;
		txDrops?: number;
	};

	let {
		port,
		metrics,
		clientName,
		vlanId,
		poeWatts,
		poeEnabled = false,
		onClose,
		onConfigure,
		onTogglePoe,
	}: {
		port: Port;
		metrics?: Metric;
		clientName?: string;
		vlanId?: number;
		poeWatts?: number;
		poeEnabled?: boolean;
		onClose?: () => void;
		onConfigure?: () => void;
		onTogglePoe?: () => void;
	} = $props();

	const displayName = $derived(port.label ?? port.name);
	const displayKind = $derived(port.kind ?? port.interface?.type ?? 'unknown');
	const displayState = $derived(port.state ?? (port.interface?.running ? 'active' : 'inactive'));
	const displaySpeed = $derived(port.speed ?? '—');
	const displayComment = $derived(port.interface?.comment ?? '');

	function formatRate(bytes: number): string {
		if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Gb`;
		if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mb`;
		if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} Kb`;
		return `${bytes} B`;
	}
</script>

<div class="port-panel">
	<!-- Header -->
	<div class="panel-header">
		<div class="panel-title-block">
			<div class="panel-title">{displayName}</div>
			<div class="panel-kind">{displayKind}</div>
		</div>
		{#if onClose}
			<button type="button" class="panel-close" onclick={onClose} aria-label="Close panel">
				<span class="bi bi-x-lg"></span>
			</button>
		{/if}
	</div>

	<div class="panel-body">
		<!-- Link state -->
		<div class="info-section">
			<SectionLabel>Link</SectionLabel>
			<div class="link-state" class:linked={displayState === 'active'}>
				<StatusBadge size="sm" status={displayState === 'active' ? 'online' : displayState === 'disabled' ? 'blocked' : 'offline'} />
				{#if displaySpeed !== '—'}
					<Tag variant="info" size="sm" label={displaySpeed} />
				{/if}
			</div>
		</div>

		<!-- Metrics -->
		{#if metrics && (metrics.rxBytes != null || metrics.txBytes != null)}
			<div class="info-section">
				<SectionLabel>Traffic</SectionLabel>
				<div class="traffic-grid">
					<div class="traffic-card">
						<div class="traffic-dir-label">RX</div>
						<div class="traffic-val">{formatRate(metrics.rxBytes ?? 0)}</div>
						<ProgressBar variant="default" size="sm" value={Math.min((metrics.rxBytes ?? 0) / 1_000_000_000 * 100, 100)} />
					</div>
					<div class="traffic-card">
						<div class="traffic-dir-label">TX</div>
						<div class="traffic-val">{formatRate(metrics.txBytes ?? 0)}</div>
						<ProgressBar variant="success" size="sm" value={Math.min((metrics.txBytes ?? 0) / 1_000_000_000 * 100, 100)} />
					</div>
				</div>
				{#if (metrics.rxErrors ?? 0) > 0 || (metrics.txErrors ?? 0) > 0}
					<div class="traffic-errors">
						Errors: {(metrics.rxErrors ?? 0) + (metrics.txErrors ?? 0)} · Drops: {(metrics.rxDrops ?? 0) + (metrics.txDrops ?? 0)}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Client -->
		{#if clientName}
			<div class="info-section">
				<SectionLabel>Connected Client</SectionLabel>
				<div class="client-card">
					<div class="client-name">{clientName}</div>
					{#if vlanId}
						<Tag variant="warning" size="sm" label={`VLAN ${vlanId}`} />
					{/if}
				</div>
			</div>
		{/if}

		<!-- Comment -->
		{#if displayComment}
			<div class="info-section">
				<SectionLabel>Comment</SectionLabel>
				<p class="comment">{displayComment}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="info-section panel-actions">
			{#if onConfigure}
				<Button variant="secondary" fullWidth onclick={onConfigure}>
					Configure Port
				</Button>
			{/if}
			{#if poeEnabled && onTogglePoe}
				<Button variant="warning" fullWidth onclick={onTogglePoe}>
					{poeWatts ? `PoE ${poeWatts}W` : 'Toggle PoE'}
				</Button>
			{/if}
		</div>
	</div>
</div>

<style lang="scss">
	.port-panel {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		height: 100%;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-line, #dedfde);
		border-radius: var(--radius-md, 6px);
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--color-line, #dedfde);

		.panel-title-block {
			.panel-title {
				font-size: var(--font-size-body, 1rem);
				font-weight: var(--font-weight-semibold, 650);
				color: var(--color-text, #171717);
			}

			.panel-kind {
				font-size: var(--font-size-small, 0.875rem);
				color: var(--color-muted, #686c6b);
				margin-top: 2px;
			}
		}

		.panel-close {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 4px;
			background: none;
			border: none;
			cursor: pointer;
			color: var(--color-muted, #686c6b);
			opacity: 0.6;

			&:hover {
				opacity: 1;
			}
		}
	}

	.panel-body {
		padding: 0 16px 16px;
		overflow-y: auto;
	}

	.info-section {
		padding-bottom: 16px;
	}

	.link-state {
		display: flex;
		align-items: center;
		gap: 8px;

		&.linked {
			padding: 10px 12px;
			border-radius: var(--radius-md, 6px);
			background: var(--color-success-light, #bbf7d0);
			border: 1px solid var(--color-success-light, #bbf7d0);
		}
	}

	.traffic-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;

		.traffic-card {
			background: var(--color-surface, #fff);
			border-radius: var(--radius-md, 6px);
			padding: 10px;
			border: 1px solid var(--color-line, #dedfde);

			.traffic-dir-label {
				font-size: 10px;
				font-weight: var(--font-weight-bold, 750);
				color: var(--color-muted, #686c6b);
				margin-bottom: 4px;
			}

			.traffic-val {
				font-size: var(--font-size-small, 0.875rem);
				font-weight: var(--font-weight-bold, 750);
				color: var(--color-text, #171717);
			}
		}
	}

	.traffic-errors {
		margin-top: 6px;
		font-size: var(--font-size-small, 0.875rem);
		color: var(--color-danger, #8a1f1f);
	}

	.client-card {
		background: var(--color-surface, #fff);
		border-radius: var(--radius-md, 6px);
		padding: 10px;
		border: 1px solid var(--color-line, #dedfde);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;

		.client-name {
			font-size: var(--font-size-small, 0.875rem);
			font-weight: var(--font-weight-semibold, 650);
			color: var(--color-text, #171717);
		}
	}

	.comment {
		margin: 0;
		font-size: var(--font-size-small, 0.875rem);
		color: var(--color-muted, #686c6b);
		line-height: 1.5;
	}

	.panel-actions {
		display: grid;
		gap: 6px;
	}
</style>
