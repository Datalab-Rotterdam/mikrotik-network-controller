<script lang="ts">
	import type { Snippet } from 'svelte';

	type Sizes = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

	type ColumnProps = {
		name: string;
		xs?: number | 'none';
		sm?: number | 'none';
		md?: number | 'none';
		lg?: number | 'none';
		xl?: number | 'none';
		xxl?: number | 'none';
		order?: number;
		push?: number;
		pull?: number;
	};

	type Props = {
		children?: Snippet;
		name: string;
		xs?: number | 'none';
		sm?: number | 'none';
		md?: number | 'none';
		lg?: number | 'none';
		xl?: number | 'none';
		xxl?: number | 'none';
		order?: number;
		push?: number;
		pull?: number;
	};

	let {
		children,
		name,
		xs,
		sm,
		md,
		lg,
		xl,
		xxl,
		order,
		push,
		pull
	}: Props = $props();

	export const type = 'Column';
	export const props = {
		name,
		xs,
		sm,
		md,
		lg,
		xl,
		xxl,
		order,
		push,
		pull
	};
</script>

{#if children}
	<div
		class="column-layout-column"
		class:order-first={order === -9999}
		class:order-last={order === 9999}
		class:order-{order}={{order !== undefined && order !== -9999 && order !== 9999}}
		class:push-{push}={{push !== undefined}}
		class:pull-{pull}={{pull !== undefined}}
	>
		{@render children()}
	</div>
{/if}
