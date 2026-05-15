<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../primitives/Icon.svelte';

	let {
		children,
		title,
		description,
		closeHref,
		open = false,
		onClose
	}: {
		children: Snippet;
		title: string;
		description?: string;
		closeHref: string;
		open?: boolean;
		onClose?: () => void;
	} = $props();

	$effect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
			return () => {
				document.body.style.overflow = '';
			};
		}
	});
</script>

{#if open}
	<div class="panel-backdrop" aria-hidden="true"></div>
	<aside class="side-panel" aria-label={title}>
		<div class="panel-header">
			<div>
				<h2>{title}</h2>
				{#if description}
					<p>{description}</p>
				{/if}
			</div>
			<a class="close-panel" href={closeHref} aria-label="Close panel" onclick={onClose}>
				<Icon name="close" size={18} />
			</a>
		</div>
		<div class="panel-body">
			{@render children()}
		</div>
	</aside>
{/if}

<style lang="scss">
	.panel-backdrop {
		display: none;
	}

	.side-panel {
		position: fixed;
		top: 48px;
		right: 0;
		z-index: 81;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		width: min(calc(100vw - 50px), 390px);
		height: calc(100dvh - 48px);
		max-height: calc(100dvh - 48px);
		background: var(--color-surface);
		box-shadow: -18px 0 42px rgba(14, 14, 16, 0.14);
		animation: slide-in 160ms ease-out;
		overflow: hidden;
	}

	.panel-header {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px;
		padding: 16px;
		border-bottom: 1px solid #eef1f3;
	}

	h2 {
		margin: 0;
		color: #2f3438;
		font-size: 16px;
	}

	p {
		margin: 6px 0 0;
		color: #65737b;
		font-size: 13px;
		line-height: 1.45;
	}

	.close-panel {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1px solid transparent;
		border-radius: 4px;
		color: #8f9aa3;

		&:hover {
			border-color: #dce4e9;
			background: #fbfdff;
		}
	}

	.panel-body {
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		overscroll-behavior: contain;
		-webkit-overflow-scrolling: touch;
		touch-action: pan-y;
		padding: 16px;
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	@media (max-width: 640px) {
		.panel-backdrop {
			display: block;
			position: fixed;
			inset: 48px 0 0 50px;
			z-index: 80;
			background: rgba(14, 14, 16, 0.34);
			backdrop-filter: blur(1px);
		}

		.side-panel {
			top: auto;
			bottom: 0;
			width: calc(100vw - 50px);
			height: min(calc(100dvh - 48px), 680px);
			max-height: calc(100dvh - 48px);
			border-radius: 10px 10px 0 0;
			box-shadow: 0 -18px 42px rgba(14, 14, 16, 0.16);
			animation-name: slide-up;
		}
	}

	@keyframes slide-up {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}
</style>
