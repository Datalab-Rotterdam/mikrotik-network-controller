<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		label,
		value,
		sub,
		trend,
		children,
		...rest
	}: {
		label: string;
		value: string | number;
		sub?: string;
		trend?: { up: boolean; label: string };
		children?: Snippet;
	} & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class="stat-card" {...rest}>
	<div class="stat-header">
		<span class="stat-label">{label}</span>
		{#if children}
			{@render children()}
		{/if}
	</div>
	<div class="stat-content">
		<span class="stat-value">{value}</span>
		{#if sub}
			<span class="stat-sub">{sub}</span>
		{/if}
		{#if trend}
			<span class="stat-trend" class:up={trend.up}>
				<span class="trend-arrow" aria-hidden="true">{trend.up ? "↑" : "↓"}</span>
				{trend.label}
			</span>
		{/if}
	</div>
</div>

<style lang="scss">
	.stat-card {
		background: var(--color-surface, #fff);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-line, #dedfde);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;

		.stat-header {
			display: flex;
			align-items: center;
			justify-content: space-between;

			.stat-label {
				font-size: 11px;
				font-weight: var(--font-weight-bold, 750);
				color: var(--color-muted, #686c6b);
				text-transform: uppercase;
				letter-spacing: 0.06em;
			}
		}

		.stat-content {
			display: flex;
			flex-direction: column;
			gap: 2px;

			.stat-value {
				font-size: 28px;
				font-weight: var(--font-weight-bold, 750);
				color: var(--color-text, #171717);
				letter-spacing: -0.03em;
				line-height: 1;
			}

			.stat-sub {
				font-size: 11px;
				color: var(--color-muted, #686c6b);
				font-weight: var(--font-weight-medium, 500);
			}

			.stat-trend {
				display: flex;
				align-items: center;
				gap: 4px;
				font-size: 11px;
				font-weight: var(--font-weight-semibold, 650);
				color: var(--color-danger, #8a1f1f);

				&.up {
					color: var(--color-success, #16a34a);
				}
			}
		}
	}
</style>
