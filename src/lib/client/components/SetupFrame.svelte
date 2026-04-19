<script lang="ts">
	import type { Snippet } from 'svelte';
	import BrandMark from './BrandMark.svelte';

	let {
		intro,
		children,
		details
	}: {
		intro: Snippet;
		children: Snippet;
		details?: Snippet;
	} = $props();
</script>

<main class="setup-page">
	<section class="setup-shell" aria-labelledby="setup-title">
		<div class="setup-intro">
			<BrandMark />
			{@render intro()}
			{#if details}
				{@render details()}
			{/if}
		</div>

		<div class="setup-workspace">
			{@render children()}
		</div>
	</section>
</main>
