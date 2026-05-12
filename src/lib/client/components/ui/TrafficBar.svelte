<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	let {
		label,
		rx,
		tx,
		max = 100,
		...rest
	}: {
		label: string;
		rx: number;
		tx: number;
		max?: number;
	} & HTMLAttributes<HTMLDivElement> = $props();
</script>

<div class="traffic-bar" {...rest}>
	<div class="traffic-header">
		<span class="traffic-label">{label}</span>
		<span class="traffic-total">{rx + tx} Mbps</span>
	</div>
	<div class="traffic-pairs">
		<div class="traffic-row">
			<span class="traffic-dir">RX</span>
			<div class="traffic-track">
				<div class="traffic-fill rx" style="width: {Math.min((rx / max) * 100, 100)}%"></div>
			</div>
			<span class="traffic-val">{rx}M</span>
		</div>
		<div class="traffic-row">
			<span class="traffic-dir">TX</span>
			<div class="traffic-track">
				<div class="traffic-fill tx" style="width: {Math.min((tx / max) * 100, 100)}%"></div>
			</div>
			<span class="traffic-val">{tx}M</span>
		</div>
	</div>
</div>

<style lang="scss">
	.traffic-bar {
		margin-bottom: 12px;

		.traffic-header {
			display: flex;
			justify-content: space-between;
			margin-bottom: 5px;

			.traffic-label {
				font-size: 12px;
				font-weight: var(--font-weight-semibold, 650);
				color: var(--color-text, #171717);
			}

			.traffic-total {
				font-size: 11px;
				color: var(--color-muted, #686c6b);
			}
		}

		.traffic-pairs {
			display: grid;
			gap: 3px;
		}

		.traffic-row {
			display: flex;
			align-items: center;
			gap: 6px;

			.traffic-dir {
				width: 20px;
				font-size: 10px;
				color: var(--color-muted, #686c6b);
				font-weight: var(--font-weight-bold, 750);
			}

			.traffic-track {
				flex: 1;
				height: 5px;
				background: var(--color-page, #f3f4f4);
				border-radius: 999px;
				overflow: hidden;

				.traffic-fill {
					height: 100%;
					border-radius: 999px;
					transition: width 0.4s ease;

					&.rx {
						background: var(--color-info, #0d6fd6);
					}

					&.tx {
						background: var(--color-success, #16a34a);
					}
				}
			}

			.traffic-val {
				width: 36px;
				font-size: 10px;
				color: var(--color-muted, #686c6b);
				text-align: right;
			}
		}
	}
</style>
