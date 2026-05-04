<script lang="ts">
	import {
		resolveDevicePortLayout,
		type DevicePortInterface,
		type ResolvedPort
	} from '$lib/shared/device-port-layouts';

	let {
		model,
		interfaces,
		variant = 'full'
	}: {
		model?: string | null;
		interfaces: DevicePortInterface[];
		variant?: 'compact' | 'full';
	} = $props();

	let selectedPortKey = $state<string | null>(null);

	const layout = $derived(resolveDevicePortLayout(model ?? undefined, interfaces));
	const ports = $derived(layout.groups.flatMap((group) => group.rows.flat()));
	const selectedPort = $derived(
		ports.find((port) => port.key === selectedPortKey) ??
			ports.find((port) => port.interface) ??
			ports[0] ??
			null
	);

	$effect(() => {
		if (selectedPortKey && !ports.some((port) => port.key === selectedPortKey)) {
			selectedPortKey = null;
		}
	});

	function selectPort(port: ResolvedPort) {
		selectedPortKey = port.key;
	}

	function formatState(port: ResolvedPort) {
		if (port.state === 'uncollected') return 'Not collected';
		if (port.state === 'disabled') return 'Disabled';
		if (port.state === 'active') return 'Running';
		return 'Inactive';
	}

	function portTitle(port: ResolvedPort) {
		const parts = [
			port.label ?? port.name,
			port.speed,
			formatState(port),
			port.interface?.comment
		].filter(Boolean);

		return parts.join(' - ');
	}
</script>

<div class:compact={variant === 'compact'} class:full={variant === 'full'} class="port-layout">
	{#if layout.groups.length}
		<div class="port-frame" aria-label="Device port layout">
			{#each layout.groups as group}
				<div class="port-group">
					{#if variant === 'full'}
						<div class="group-label">
							<span>{group.label}</span>
							{#if group.speed}
								<strong>{group.speed}</strong>
							{/if}
						</div>
					{/if}
					<div class="port-rows">
						{#each group.rows as row}
							<div class="port-row">
								{#each row as port}
									<button
										type="button"
										class={`port port-${port.state}`}
										class:selected={selectedPort?.key === port.key}
										title={portTitle(port)}
										aria-label={`${port.name}: ${formatState(port)}`}
										onclick={() => selectPort(port)}
									>
										<span>{port.label ?? port.name}</span>
									</button>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		{#if variant === 'full'}
			<div class="legend" aria-label="Port legend">
				<span><i class="legend-active"></i>Running</span>
				<span><i class="legend-inactive"></i>Inactive</span>
				<span><i class="legend-disabled"></i>Disabled</span>
				<span><i class="legend-uncollected"></i>Not collected</span>
			</div>
		{/if}

		{#if selectedPort}
			<div class="selected-port">
				<div>
					<span>Selected port</span>
					<strong>{selectedPort.name}</strong>
				</div>
				<div>
					<span>State</span>
					<strong>{formatState(selectedPort)}</strong>
				</div>
				<div>
					<span>Type</span>
					<strong>{selectedPort.interface?.type ?? selectedPort.kind ?? '-'}</strong>
				</div>
				<div>
					<span>Speed</span>
					<strong>{selectedPort.speed ?? '-'}</strong>
				</div>
				{#if variant === 'full'}
					<div>
						<span>MAC Address</span>
						<strong>{selectedPort.interface?.macAddress ?? '-'}</strong>
					</div>
					<div>
						<span>Comment</span>
						<strong>{selectedPort.interface?.comment ?? '-'}</strong>
					</div>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="empty-ports">No interfaces collected yet.</div>
	{/if}
</div>

<style lang="scss">
	.port-layout {
		display: grid;
		gap: 12px;
		min-width: 0;
	}

	.port-frame {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 12px;
		border: 1px solid #e2e7eb;
		border-radius: 6px;
		padding: 12px;
		background: #fbfdff;
		overflow-x: auto;
	}

	.port-group {
		display: grid;
		gap: 7px;
		min-width: 0;
	}

	.group-label {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		color: #6f7780;
		font-size: 12px;
		font-weight: 800;
	}

	.group-label strong {
		color: #9aa3aa;
		font-size: 11px;
	}

	.port-rows {
		display: grid;
		gap: 6px;
	}

	.port-row {
		display: flex;
		gap: 5px;
	}

	.port {
		display: grid;
		place-items: center;
		width: 28px;
		height: 24px;
		border: 1px solid transparent;
		border-radius: 3px;
		padding: 0;
		color: #263139;
		background: #cfd4d8;
		cursor: pointer;
	}

	.port span {
		max-width: 100%;
		font-size: 10px;
		font-weight: 800;
		line-height: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.port:hover,
	.port:focus-visible,
	.port.selected {
		outline: 0;
		border-color: var(--color-link);
		box-shadow: 0 0 0 2px rgba(13, 111, 214, 0.16);
	}

	.port-active {
		color: #ffffff;
		background: #35a861;
	}

	.port-inactive {
		color: #ffffff;
		background: #535b63;
	}

	.port-disabled {
		color: #727b82;
		background: #d9dde0;
	}

	.port-uncollected {
		color: #9aa3aa;
		background: #eef1f3;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		color: #6f7780;
		font-size: 12px;
		font-weight: 700;
	}

	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.legend i {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.legend-active {
		background: #35a861;
	}

	.legend-inactive {
		background: #535b63;
	}

	.legend-disabled {
		background: #d9dde0;
	}

	.legend-uncollected {
		background: #eef1f3;
		border: 1px solid #cfd4d8;
	}

	.selected-port {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 8px;
	}

	.selected-port div {
		display: grid;
		gap: 4px;
		min-width: 0;
		border: 1px solid #edf0f2;
		border-radius: 5px;
		padding: 9px;
		background: #ffffff;
	}

	.selected-port span {
		color: #8a949c;
		font-size: 11px;
		font-weight: 800;
	}

	.selected-port strong {
		min-width: 0;
		color: #30373d;
		font-size: 13px;
		font-weight: 650;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty-ports {
		display: grid;
		place-items: center;
		min-height: 90px;
		border: 1px solid #eef1f3;
		border-radius: 6px;
		color: #8a949c;
		background: #fbfdff;
		font-size: 13px;
	}

	.compact {
		gap: 9px;
	}

	.compact .port-frame {
		gap: 7px;
		padding: 9px;
	}

	.compact .port-rows {
		gap: 4px;
	}

	.compact .port-row {
		gap: 3px;
	}

	.compact .port {
		width: 18px;
		height: 15px;
		border-radius: 2px;
	}

	.compact .port span {
		font-size: 0;
	}

	.compact .selected-port {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.compact .selected-port div {
		padding: 8px;
	}

	@media (max-width: 760px) {
		.selected-port {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
