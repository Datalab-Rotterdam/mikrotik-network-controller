<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let {
		children,
		trigger,
		rootClass = '',
		panelClass = '',
		ariaLabel,
		title,
		align = 'left'
	}: {
		children: Snippet;
		trigger: Snippet;
		rootClass?: string;
		panelClass?: string;
		ariaLabel?: string;
		title?: string;
		align?: 'left' | 'right';
	} = $props();

	let dropdownElement: HTMLDetailsElement;

	onMount(() => {
		function closeOnOutsideClick(event: PointerEvent) {
			if (!dropdownElement.open || dropdownElement.contains(event.target as Node)) {
				return;
			}

			dropdownElement.open = false;
		}

		function closeOnEscape(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				dropdownElement.open = false;
			}
		}

		document.addEventListener('pointerdown', closeOnOutsideClick);
		document.addEventListener('keydown', closeOnEscape);

		return () => {
			document.removeEventListener('pointerdown', closeOnOutsideClick);
			document.removeEventListener('keydown', closeOnEscape);
		};
	});
</script>

<details class={['dropdown', rootClass]} bind:this={dropdownElement}>
	<summary aria-label={ariaLabel} title={title}>
		{@render trigger()}
	</summary>

	<div class={['dropdown-panel', `align-${align}`, panelClass]}>
		{@render children()}
	</div>
</details>

<style lang="scss">
	.dropdown {
		position: relative;
		min-width: 0;
	}

	summary {
		list-style: none;
		cursor: pointer;

		&::-webkit-details-marker {
			display: none;
		}
	}

	.dropdown-panel {
		position: absolute;
		top: calc(100% + 8px);
		z-index: 70;
		border: 1px solid #dce4e9;
		border-radius: 6px;
		background: var(--color-surface);
		box-shadow: var(--shadow-panel);
		overflow: hidden;
	}

	.align-left {
		left: 0;
	}

	.align-right {
		right: 0;
	}
</style>
