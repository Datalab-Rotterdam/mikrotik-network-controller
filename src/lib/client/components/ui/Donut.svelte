<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	let {
		value,
		total,
		color,
		label,
		size = 56,
		...rest
	}: {
		value: number;
		total: number;
		color: string;
		label: string;
		size?: number;
	} & HTMLAttributes<HTMLDivElement> = $props();

	const r = $derived(size / 2 - 4);
	const cx = $derived(size / 2);
	const cy = $derived(size / 2);
	const stroke = $derived(5);
	const circ = $derived(2 * Math.PI * r);
	const pct = $derived(total ? value / total : 0);
	const dash = $derived(pct * circ);
</script>

<div class="donut" {...rest}>
	<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
		<circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-line, #dedfde)" stroke-width={stroke} />
		<circle
			cx={cx}
			cy={cy}
			r={r}
			fill="none"
			stroke-linecap="round"
			stroke-width={stroke}
			stroke-dasharray={`${dash} ${circ}`}
			transform={`rotate(-90 ${cx} ${cy})`}
			opacity={0.9}
			style="stroke: ${color}"
		/>
		<text
			x={cx}
			y={cy + 1}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={Math.round(size / 5)}
			font-weight="800"
			fill="var(--color-text, #171717)"
		>
			{value}
		</text>
	</svg>
	<div class="donut-label">
		<div class="donut-label-text">{label}</div>
		<div class="donut-total">{total} total</div>
	</div>
</div>

<style lang="scss">
	.donut {
		display: flex;
		align-items: center;
		gap: 12px;

		.donut-label {
			.donut-label-text {
				font-size: 13px;
				font-weight: var(--font-weight-bold, 750);
				color: var(--color-text, #171717);
			}

			.donut-total {
				font-size: 11px;
				color: var(--color-muted, #686c6b);
			}
		}
	}
</style>
