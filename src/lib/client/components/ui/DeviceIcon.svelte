<script lang="ts">
	type DeviceKind = "router" | "switch" | "ap";

	let {
		type = "router",
		size = 28,
	}: {
		type?: DeviceKind;
		size?: number;
	} = $props();
</script>

{#if type === "switch"}
	<svg
		width={size}
		height={size}
		viewBox="0 0 28 28"
		fill="none"
		aria-hidden="true"
		class="device-icon"
	>
		<rect x="2" y="9" width="24" height="10" rx="2" fill="currentColor" opacity="0.12" />
		<rect x="2" y="9" width="24" height="10" rx="2" stroke="currentColor" stroke-width="1.5" />
		{#each [5, 8, 11, 14, 17, 20, 23] as x}
			<rect x={x} y="12" width="2" height="4" rx="0.5" fill="currentColor" opacity="0.6" />
		{/each}
	</svg>
{:else if type === "ap"}
	<svg
		width={size}
		height={size}
		viewBox="0 0 28 28"
		fill="none"
		aria-hidden="true"
		class="device-icon"
	>
		<path d="M14 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.5" />
		<path d="M14 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" fill="currentColor" />
		<path d="M8.5 8.5a8 8 0 0 1 11 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
		<path d="M10.8 10.8a5 5 0 0 1 6.4 0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
		<line x1="14" y1="18" x2="14" y2="23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4" />
	</svg>
{:else}
	<svg
		width={size}
		height={size}
		viewBox="0 0 28 28"
		fill="none"
		aria-hidden="true"
		class="device-icon"
	>
		<rect x="2" y="8" width="24" height="12" rx="2" fill="currentColor" opacity="0.1" stroke="currentColor" stroke-width="1.5" />
		<circle cx="22" cy="14" r="2" fill="currentColor" opacity="0.5" />
		<circle cx="17" cy="14" r="2" fill="currentColor" opacity="0.3" />
		{#each [5, 9, 13] as x}
			<line x1={x} y1="11" x2={x} y2="17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.4" />
		{/each}
	</svg>
{/if}

<style lang="scss">
	.device-icon {
		display: inline-block;
		flex-shrink: 0;
	}
</style>
