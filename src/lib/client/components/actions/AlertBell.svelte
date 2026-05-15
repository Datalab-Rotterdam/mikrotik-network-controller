<script lang="ts">
	import { useActionSocket } from '$lib/client/actions/use-action-socket';
	import type { ActionEvent } from '$lib/shared/action-events';
	import Icon from '$lib/client/components/primitives/Icon.svelte';

	let {
		alertsHref,
		initialCount = 0
	}: {
		alertsHref: string;
		initialCount?: number;
	} = $props();

	let count = $state(initialCount);
	const actions = useActionSocket();

	$effect(() =>
		actions.subscribe(['alert.fired', 'alert.resolved'], (event: ActionEvent) => {
			if (event.type === 'alert.fired') count += 1;
			if (event.type === 'alert.resolved') count = Math.max(0, count - 1);
		})
	);
</script>

<a
	href={alertsHref}
	class="bell-btn"
	aria-label="Alerts{count > 0 ? ` (${count} active)` : ''}"
	title="Alerts"
>
	<Icon name="bell" size={20} />
	{#if count > 0}
		<span class="bell-badge" aria-hidden="true">{count > 99 ? '99+' : count}</span>
	{/if}
</a>

<style>
	.bell-btn {
		position: relative;
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--color-brand-muted);
		background: transparent;
		text-decoration: none;
		cursor: pointer;

		&:hover {
			border-color: var(--color-brand-light);
			color: var(--color-brand);
			background: var(--color-surface-hover, #f2f2f2);
		}

		&:focus-visible {
			outline: 2px solid var(--color-link, #3b82f6);
			outline-offset: 2px;
		}

		&:active {
			filter: brightness(0.9);
		}
	}

	.bell-badge {
		position: absolute;
		top: 2px;
		right: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 14px;
		height: 14px;
		padding: 0 3px;
		border-radius: 7px;
		background: var(--color-danger, #ef4444);
		color: #fff;
		font-size: 9px;
		font-weight: 800;
		line-height: 1;
		pointer-events: none;
	}
</style>
