<script lang="ts">
	import { Handle, Position, type NodeProps } from '@xyflow/svelte';

	type DeviceNodeData = {
		imageSrc: string;
		name: string;
		model: string;
		status: string;
		kind: 'router' | 'switch';
		adopted: boolean;
	};

	let { data }: NodeProps = $props();
	const node = $derived(data as DeviceNodeData);

	const hasImage = $derived(Boolean(node.imageSrc) && node.imageSrc !== '/favicon.svg');
	const isOnline = $derived(node.status === 'online');

	const statusColor = $derived(
		node.status === 'online'
			? 'online'
			: node.status === 'offline'
				? 'offline'
				: node.status === 'auth_failed'
					? 'warn'
					: 'discovered'
	);
</script>

<!-- Handles centered so edges originate from node center -->
<Handle
	type="target"
	position={Position.Top}
	style="left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0; pointer-events: none;"
/>
<Handle
	type="source"
	position={Position.Bottom}
	style="left: 50%; top: 50%; transform: translate(-50%, -50%); opacity: 0; pointer-events: none;"
/>

<div class="device-node" class:offline={!isOnline} data-status={statusColor}>
	<div class="icon-wrap" class:has-image={hasImage}>
		{#if hasImage}
			<img src={node.imageSrc} alt={node.name} class="device-img" />
		{:else if node.kind === 'switch'}
			<svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<rect x="2" y="8" width="44" height="16" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
				<circle cx="12" cy="16" r="2.5" fill="currentColor"/>
				<circle cx="24" cy="16" r="2.5" fill="currentColor"/>
				<circle cx="36" cy="16" r="2.5" fill="currentColor"/>
				<line x1="12" y1="8" x2="12" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="24" y1="8" x2="24" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="36" y1="24" x2="36" y2="29" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<rect x="40" y="13" width="3" height="6" rx="1" fill="currentColor" opacity="0.5"/>
			</svg>
		{:else}
			<svg viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<rect x="2" y="8" width="44" height="16" rx="4" stroke="currentColor" stroke-width="2" fill="none"/>
				<line x1="24" y1="8" x2="24" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="16" y1="2" x2="32" y2="2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="16" y1="2" x2="16" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<line x1="32" y1="2" x2="32" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				<circle cx="36" cy="16" r="2.5" fill="currentColor"/>
				<circle cx="42" cy="16" r="1.5" fill="currentColor" opacity="0.6"/>
				<rect x="6" y="13" width="3" height="6" rx="1" fill="currentColor" opacity="0.4"/>
				<rect x="11" y="13" width="3" height="6" rx="1" fill="currentColor" opacity="0.4"/>
			</svg>
		{/if}
		<span class="status-dot" aria-label={node.status}></span>
	</div>
	<strong class="node-name">{node.name}</strong>
</div>

<style lang="scss">
	.device-node {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		width: 120px;
		cursor: pointer;
		transition: opacity 0.15s;

		&.offline {
			opacity: 0.4;
			filter: grayscale(1);
		}
	}

	.icon-wrap {
		position: relative;
		display: grid;
		place-items: center;
		width: 64px;
		height: 44px;
		border-radius: 8px;
		background: var(--color-surface, #fff);
		color: #0f6fff;

		svg {
			width: 48px;
			height: 32px;
		}

		&.has-image {
			width: 110px;
			height: 68px;
			background: transparent;
			border-radius: 0;
		}
	}

	.device-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.status-dot {
		position: absolute;
		top: -4px;
		right: -4px;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		border: 2px solid var(--color-page, #f5f7f9);
		background: #8a949c;

		.device-node[data-status='online'] & {
			background: #22c55e;
		}

		.device-node[data-status='offline'] & {
			background: #ef4444;
		}

		.device-node[data-status='warn'] & {
			background: #f59e0b;
		}
	}

	.node-name {
		display: block;
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: center;
		color: var(--color-text, #2f3438);
		font-size: 12px;
		font-weight: 600;
	}
</style>
