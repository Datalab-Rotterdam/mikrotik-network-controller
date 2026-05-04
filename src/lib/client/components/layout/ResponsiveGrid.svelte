<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		min = '220px',
		gap = '16px',
		label
	}: {
		children: Snippet;
		min?: string;
		gap?: string;
		label?: string;
	} = $props();
</script>

<div
	class="responsive-grid"
	style={`--grid-min: ${min}; --grid-gap: ${gap};`}
	aria-label={label}
>
	{@render children()}
</div>

<style>
	.responsive-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--grid-min)), 1fr));
		gap: var(--grid-gap);
	}
</style>
