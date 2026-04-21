<script lang="ts">
	import AccountMenu from '$lib/client/components/AccountMenu.svelte';
	import ActionSocket from '$lib/client/components/actions/ActionSocket.svelte';
	import SiteSwitcher from '$lib/client/components/SiteSwitcher.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	const basePath = $derived(`/manage/${data.site.id}`);

	const navItems = $derived([
		{ href: basePath, label: 'Dashboard', icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z' },
		{ href: `${basePath}/topology`, label: 'Topology', icon: 'M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm2.6-7.2 4.8 6.4 1.6-1.2-4.8-6.4-1.6 1.2Zm.4 9.2h4v-2h-4v2Z' },
		{ href: `${basePath}/devices`, label: 'Devices', icon: 'M4 5h14v10H4V5Zm2 2v6h10V7H6Zm-3 11h18v2H3v-2Zm17-9h1v5h-1V9Z' },
		{ href: `${basePath}/clients`, label: 'Clients', icon: 'M7 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-3 11c.8-3.3 3.7-5 8-5s7.2 1.7 8 5H4Z' },
		{ href: `${basePath}/jobs`, label: 'Jobs', group: 'management', icon: 'M5 4h14v4H5V4Zm0 6h14v4H5v-4Zm0 6h14v4H5v-4Zm2-10v1h10V6H7Zm0 6v1h10v-1H7Zm0 6v1h10v-1H7Z' },
		{ href: `${basePath}/syslog`, label: 'Syslog', group: 'management', icon: 'M5 3h14v18H5V3Zm3 4h8V5H8v2Zm0 4h8V9H8v2Zm0 4h6v-2H8v2Zm0 4h8v-2H8v2Z' },
		{ href: `${basePath}/settings`, label: 'Settings', icon: 'M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5A9 9 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z' }
	]);
</script>

{#if data.user}
	<ActionSocket siteId={data.site.id}>
		<div class="app-shell">
			<aside class="sidebar-rail">
				<a class="rail-logo" href={basePath} aria-label={data.site.name}>
					<img src={favicon} alt="" width="25" height="27" />
				</a>
				<nav class="rail-nav" aria-label="Primary navigation">
					{#each navItems as item}
						{#if item.group === 'management'}
							<div class="rail-separator" aria-hidden="true"></div>
						{/if}
						{#if item.group === 'site'}
							<a
								class="rail-link"
								href={item.href}
								aria-label={item.label}
								title={item.label}
								aria-current={data.pathname === item.href ? 'page' : undefined}
							>
								<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
									<path fill="currentColor" d={item.icon} />
								</svg>
							</a>
							<div class="rail-separator" aria-hidden="true"></div>
						{:else}
							<a
								class="rail-link"
								href={item.href}
								aria-label={item.label}
								title={item.label}
								aria-current={data.pathname === item.href ? 'page' : undefined}
							>
								<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
									<path fill="currentColor" d={item.icon} />
								</svg>
							</a>
						{/if}
					{/each}
				</nav>
				<div class="rail-footer"></div>
			</aside>
			<main class="main">
				<header class="topbar">
					<SiteSwitcher activeSite={data.site} sites={data.sites} pathname={data.pathname} />
					<AccountMenu user={data.user} />
				</header>
				<section class="content">
					{@render children()}
				</section>
			</main>
		</div>
	</ActionSocket>
{:else}
	{@render children()}
{/if}

<style>
	.app-shell {
		display: grid;
		grid-template-columns: 50px minmax(0, 1fr);
		min-height: 100vh;
	}

	.sidebar-rail {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--color-line);
		background: var(--color-surface);
		color: var(--color-brand-muted);
	}

	.rail-logo {
		display: grid;
		place-items: center;
		width: 50px;
		height: 48px;
		background: var(--color-surface);
	}

	.rail-logo img {
		width: 25px;
		height: auto;
	}

	.rail-nav {
		display: grid;
		gap: 7px;
		justify-items: center;
		padding: 14px 0;
	}

	.rail-link {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid transparent;
		border-radius: 4px;
		color: var(--color-brand-muted);
		background: transparent;
		cursor: pointer;
	}

	.rail-link:hover,
	.rail-link[aria-current='page'] {
		border-color: var(--color-brand-light);
		color: var(--color-brand);
		background: #f2f2f2;
	}

	.rail-separator {
		width: 28px;
		height: 1px;
		margin: 4px 0;
		background: var(--color-line);
	}

	.rail-footer {
		margin-top: auto;
		padding: 12px 0;
	}

	.main {
		min-width: 0;
		background: var(--color-page);
	}

	.topbar {
		position: relative;
		z-index: 60;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 16px;
		min-height: 48px;
		padding: 0 18px 0 14px;
		border-bottom: 1px solid var(--color-line);
		background: var(--color-surface);
	}

	.content {
		padding: 18px 14px;
	}

	@media (max-width: 900px) {
		.app-shell {
			grid-template-columns: 50px minmax(0, 1fr);
		}

		.topbar {
			gap: 8px;
			padding-right: 10px;
		}
	}
</style>
