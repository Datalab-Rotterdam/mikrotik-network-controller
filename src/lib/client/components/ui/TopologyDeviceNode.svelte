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

	let {
		data,
		targetPosition = Position.Top,
		sourcePosition = Position.Bottom
	}: NodeProps = $props();

const node = $derived(data as DeviceNodeData);
const hasThumbnail = $derived(node.imageSrc !== '/favicon.svg');
</script>

<Handle type="target" position={targetPosition} />
<div class="device-node" class:thumbnail={hasThumbnail} class:switch={node.kind === 'switch'} class:discovered={!node.adopted}>
	<div class="device-image">
		<img src={node.imageSrc} alt="" width="130" height="84" />
	</div>
	<div class="device-copy">
		<strong>{node.name}</strong>
		{#if !hasThumbnail}
			<span>{node.model || (node.kind === 'switch' ? 'MikroTik switch' : 'MikroTik router')}</span>
			<em>{node.status}</em>
		{/if}
	</div>
</div>
<Handle type="source" position={sourcePosition} />

<style lang="scss">
	.device-node {
		display: grid;
		grid-template-columns: 54px minmax(0, 1fr);
		gap: 9px;
		align-items: center;
		width: 210px;
		border: 1px solid #dfe6eb;
		border-left: 4px solid #0f6fff;
		border-radius: 6px;
		padding: 9px;
		background: var(--color-surface);
		box-shadow: 0 8px 18px rgba(14, 14, 16, 0.08);
	}

	.device-node.thumbnail {
		display: grid;
		grid-template-columns: 1fr;
		justify-items: center;
		gap: 2px;
		width: 164px;
		border: 0;
		padding: 0;
		background: transparent;
		box-shadow: none;
	}

	.device-node.switch {
		border-left-color: #16a26b;
	}

	.device-node.discovered {
		border-left-color: #e5a13a;
	}

	.device-image {
		display: grid;
		place-items: center;
		width: 52px;
		height: 38px;
		border-radius: 4px;
		background: #fbfdff;
	}

	img {
		width: 52px;
		height: 38px;
		object-fit: contain;
	}

	.thumbnail .device-image {
		width: 150px;
		height: 86px;
		background: transparent;
	}

	.thumbnail img {
		width: 150px;
		height: 86px;
		object-fit: contain;
	}

	.device-copy {
		display: grid;
		min-width: 0;
		gap: 2px;
	}

	strong,
	span,
	em {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	strong {
		color: #2f3438;
		font-size: 13px;
	}

	.thumbnail strong {
		color: var(--color-link);
		font-size: 13px;
		font-weight: 500;
		text-align: center;
	}

	span {
		color: #6f7a83;
		font-size: 12px;
	}

	em {
		color: #8a949c;
		font-size: 11px;
		font-style: normal;
		text-transform: capitalize;
	}
</style>
