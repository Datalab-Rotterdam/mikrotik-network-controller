<script lang="ts">
	import TerminalPane from '$lib/client/components/TerminalPane.svelte';

	let { data } = $props();

	const basePath = $derived(`/manage/${data.site.id}`);
	const device = $derived(data.device);
	const deviceName = $derived(device.identity ?? device.name);

	function formatLabel(value: string | null | undefined) {
		if (!value) {
			return '-';
		}

		return value
			.split('_')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ');
	}
</script>

<svelte:head>
	<title>{deviceName} - Terminal</title>
</svelte:head>

<section class="terminal-page">
	<header class="terminal-banner">
		<a class="back-link" href={`${basePath}/devices/${device.id}`} aria-label="Back to device">
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path fill="currentColor" d="m10.8 5.4 1.4 1.4L8 11h11v2H8l4.2 4.2-1.4 1.4L4.2 12l6.6-6.6Z" />
			</svg>
		</a>
		<div class="banner-main">
			<span>SSH terminal</span>
			<h1>{deviceName}</h1>
			<p>{device.model || 'MikroTik device'} - {device.host}:{device.sshPort ?? 22}</p>
		</div>
		<div class="banner-facts" aria-label="Controlled device">
			<div>
				<span>Site</span>
				<strong>{data.site.name}</strong>
			</div>
			<div>
				<span>Status</span>
				<strong>{formatLabel(device.connectionStatus)}</strong>
			</div>
			<div>
				<span>RouterOS</span>
				<strong>{device.routerOsVersion || '-'}</strong>
			</div>
		</div>
	</header>

	{#if data.terminalAvailable}
		<TerminalPane action="?/terminal" variant="standalone" />
	{:else}
		<div class="empty-state">{data.terminalUnavailableMessage}</div>
	{/if}
</section>

<style lang="scss">
	.terminal-page {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: 10px;
		min-height: calc(100vh - 20px);
	}

	.terminal-banner {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		border: 1px solid #2b3a46;
		border-radius: 6px;
		padding: 10px;
		background: #141d25;
	}

	.back-link {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid #314454;
		border-radius: 4px;
		color: #d7e0e7;
		background: #1b2833;
	}

	.banner-main {
		min-width: 0;
	}

	.banner-main span,
	.banner-facts span {
		color: #8fa1ae;
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
	}

	h1,
	p {
		margin: 0;
	}

	h1 {
		margin-top: 3px;
		color: #eef5f9;
		font-size: 20px;
		font-weight: 850;
		overflow-wrap: anywhere;
	}

	p {
		margin-top: 4px;
		color: #b5c3cc;
		font-size: 13px;
	}

	.banner-facts {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, auto));
		gap: 10px;
	}

	.banner-facts div {
		display: grid;
		gap: 4px;
		min-width: 112px;
		border-left: 1px solid #2e3d49;
		padding-left: 12px;
	}

	.banner-facts strong {
		min-width: 0;
		color: #eef5f9;
		font-size: 13px;
		overflow-wrap: anywhere;
	}

	.empty-state {
		display: grid;
		place-items: center;
		min-height: 320px;
		border: 1px solid #2b3a46;
		border-radius: 6px;
		padding: 18px;
		color: #b5c3cc;
		background: #141d25;
		font-size: 13px;
		text-align: center;
	}

	@media (max-width: 900px) {
		.terminal-banner {
			grid-template-columns: auto minmax(0, 1fr);
		}

		.banner-facts {
			grid-column: 1 / -1;
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 640px) {
		.terminal-page {
			min-height: calc(100vh - 20px);
		}

		.banner-facts {
			grid-template-columns: minmax(0, 1fr);
		}

		.banner-facts div {
			border-left: 0;
			border-top: 1px solid #2e3d49;
			padding: 10px 0 0;
		}
	}
</style>
