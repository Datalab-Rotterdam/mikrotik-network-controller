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
		gap?: string;
		align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
		direction?: 'row' | 'column';
		wrap?: boolean;
	};

	let {
		children,
		gap = '16px',
		align = 'stretch',
		direction = 'row',
		wrap = false
	}: Props = $props();

	function getColumns() {
		if (!children) return [];
		const nodes = Array.from(children() as any);
		return nodes
			.filter((node: any) => node && node.type === 'Column')
			.map((node: any) => node.props);
	}

	let columnElements: ColumnProps[] = $derived(getColumns());
</script>

<div
	class="column-layout"
	style:--gap={gap}
	class:column-layout-direction-row={direction === 'row'}
	class:column-layout-direction-column={direction === 'column'}
	class:column-layout-wrap={wrap}
	class:column-layout-align-start={align === 'start'}
	class:column-layout-align-center={align === 'center'}
	class:column-layout-align-end={align === 'end'}
	class:column-layout-align-baseline={align === 'baseline'}
	class:column-layout-align-stretch={align === 'stretch'}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style lang="scss">
	.column-layout {
		display: flex;
		flex-direction: var(--direction, row);
		gap: var(--gap, 16px);
		align-items: var(--align, stretch);
		flex-wrap: var(--wrap, false);

		&.column-layout-direction-row {
			--direction: row;
		}

		&.column-layout-direction-column {
			--direction: column;
		}

		&.column-layout-wrap {
			--wrap: wrap;
		}

		&.column-layout-align-start {
			--align: flex-start;
		}

		&.column-layout-align-center {
			--align: center;
		}

		&.column-layout-align-end {
			--align: flex-end;
		}

		&.column-layout-align-baseline {
			--align: baseline;
		}

		&.column-layout-align-stretch {
			--align: stretch;
		}

		.column-layout-column {
			min-width: 0;
			min-height: 0;
		}
	}
</style>
