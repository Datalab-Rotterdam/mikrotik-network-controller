<script lang="ts">
	type Sample = { t: number; rx: number; tx: number };

	let {
		samples,
		width = 160,
		height = 36,
		showLabels = true
	}: {
		samples: Sample[];
		width?: number;
		height?: number;
		showLabels?: boolean;
	} = $props();

	function formatRate(bytesPerSec: number): string {
		if (bytesPerSec >= 1_000_000) return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
		if (bytesPerSec >= 1_000) return `${(bytesPerSec / 1_000).toFixed(0)} KB/s`;
		return `${bytesPerSec.toFixed(0)} B/s`;
	}

	const points = $derived(() => {
		if (samples.length < 2) return { rxPts: '', txPts: '', peakRx: 0, peakTx: 0, lastRx: 0, lastTx: 0 };

		const tMin = samples[0].t;
		const tMax = samples[samples.length - 1].t;
		const tRange = tMax - tMin || 1;

		const peakRx = Math.max(...samples.map((s) => s.rx));
		const peakTx = Math.max(...samples.map((s) => s.tx));
		const yMax = Math.max(peakRx, peakTx, 1);

		const pad = 2;
		const w = width - pad * 2;
		const h = height - pad * 2;

		function toSvgPts(key: 'rx' | 'tx') {
			return samples
				.map((s) => {
					const x = pad + ((s.t - tMin) / tRange) * w;
					const y = pad + h - (s[key] / yMax) * h;
					return `${x.toFixed(1)},${y.toFixed(1)}`;
				})
				.join(' ');
		}

		return {
			rxPts: toSvgPts('rx'),
			txPts: toSvgPts('tx'),
			peakRx,
			peakTx,
			lastRx: samples[samples.length - 1].rx,
			lastTx: samples[samples.length - 1].tx
		};
	});

	const p = $derived(points());
</script>

<div class="sparkline-wrap">
	<svg
		{width}
		{height}
		viewBox="0 0 {width} {height}"
		aria-hidden="true"
		class="sparkline-svg"
	>
		{#if samples.length >= 2}
			<!-- RX line (download) — blue -->
			<polyline
				points={p.rxPts}
				fill="none"
				stroke="var(--color-link, #3b82f6)"
				stroke-width="1.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
			<!-- TX line (upload) — green -->
			<polyline
				points={p.txPts}
				fill="none"
				stroke="var(--color-success, #22c55e)"
				stroke-width="1.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>
		{:else}
			<text x="50%" y="55%" text-anchor="middle" class="no-data-text">No data</text>
		{/if}
	</svg>
	{#if showLabels && samples.length >= 2}
		<div class="sparkline-legend">
			<span class="legend-rx">↓ {formatRate(p.lastRx)}</span>
			<span class="legend-tx">↑ {formatRate(p.lastTx)}</span>
		</div>
	{/if}
</div>

<style>
	.sparkline-wrap {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.sparkline-svg {
		display: block;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-border) 30%, transparent);
	}

	.no-data-text {
		fill: var(--color-muted);
		font-size: 9px;
	}

	.sparkline-legend {
		display: flex;
		gap: 8px;
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}

	.legend-rx {
		color: var(--color-link, #3b82f6);
	}

	.legend-tx {
		color: var(--color-success, #22c55e);
	}
</style>
