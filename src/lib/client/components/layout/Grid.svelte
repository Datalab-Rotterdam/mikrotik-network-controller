<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	let {
		columns = '1',
		rows = 'auto',
		gap = '16px',
		columnGap,
		rowGap,
		justifyItems,
		alignItems,
		justifyContent,
		alignContent,
		autoFlow = '',
		children,
		...rest
	}: {
		columns?: string;
		rows?: string;
		gap?: string;
		columnGap?: string;
		rowGap?: string;
		justifyItems?: string;
		alignItems?: string;
		justifyContent?: string;
		alignContent?: string;
		autoFlow?: string;
		children?: Snippet;
	} & HTMLAttributes<HTMLElement> = $props();

	let style = $derived(
		[
			`display: grid;`,
			`grid-template-columns: ${columns};`,
			`grid-template-rows: ${rows};`,
			`gap: ${gap};`,
			columnGap ? `column-gap: ${columnGap};` : '',
			rowGap ? `row-gap: ${rowGap};` : '',
			justifyItems ? `justify-items: ${justifyItems};` : '',
			alignItems ? `align-items: ${alignItems};` : '',
			justifyContent ? `justify-content: ${justifyContent};` : '',
			alignContent ? `align-content: ${alignContent};` : '',
			autoFlow ? `grid-auto-flow: ${autoFlow};` : '',
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div style={style} {...rest}>
	{#if children}
		{@render children()}
	{/if}
</div>
