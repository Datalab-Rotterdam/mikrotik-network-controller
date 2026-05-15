<script lang="ts">
	import AccountMenu from '$lib/client/components/ui/AccountMenu.svelte';
	import ActionSocket from '$lib/client/components/actions/ActionSocket.svelte';
	import AlertBell from '$lib/client/components/actions/AlertBell.svelte';
	import LiveDataInvalidator from '$lib/client/components/actions/LiveDataInvalidator.svelte';
	import SiteSwitcher from '$lib/client/components/ui/SiteSwitcher.svelte';
	import Icon from '$lib/client/components/primitives/Icon.svelte';
	import type { IconName } from '$lib/client/components/primitives/icons';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();
	const basePath = $derived(`/manage/${data.site.id}`);
	const isTerminalToolFrame = $derived(
		data.pathname.startsWith(`${basePath}/devices/`) && data.pathname.endsWith('/terminal')
	);

	const hasDevices = $derived(data.deviceCount > 0);

	const navItems: Array<{ href: string; label: string; icon: IconName; group?: string }> = $derived([
		{ href: basePath, label: 'Dashboard', icon: 'dashboard' },
		{ href: `${basePath}/topology`, label: 'Topology', icon: 'topology' },
		{ href: `${basePath}/devices`, label: 'Devices', icon: 'monitor' },
		{ href: `${basePath}/clients`, label: 'Clients', icon: 'person' },
		...(hasDevices ? [
			{ href: `${basePath}/network`, label: 'Network', icon: 'shield' as IconName },
			{ href: `${basePath}/ports`, label: 'Ports', icon: 'ports' as IconName },
		] : []),
		{ href: `${basePath}/alerts`, label: 'Alerts', icon: 'bell' },
		{ href: `${basePath}/config/templates`, label: 'Config', icon: 'document' },
		{ href: `${basePath}/jobs`, label: 'Jobs', group: 'management', icon: 'jobs' },
		{ href: `${basePath}/syslog`, label: 'Syslog', group: 'management', icon: 'log' },
		{ href: `${basePath}/settings`, label: 'Settings', icon: 'gear' },
	]);

	function isNavActive(href: string) {
		return data.pathname === href || (href !== basePath && data.pathname.startsWith(`${href}/`));
	}
</script>

{#if data.user && isTerminalToolFrame}
	<div class="tool-frame">
		{@render children()}
	</div>
{:else if data.user}
	<ActionSocket siteId={data.site.id}>
		<LiveDataInvalidator siteId={data.site.id} />
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
								aria-current={isNavActive(item.href) ? 'page' : undefined}
							>
								<Icon name={item.icon} size={22} />
							</a>
							<div class="rail-separator" aria-hidden="true"></div>
						{:else}
							<a
								class="rail-link"
								href={item.href}
								aria-label={item.label}
								title={item.label}
								aria-current={isNavActive(item.href) ? 'page' : undefined}
							>
								<Icon name={item.icon} size={22} />
							</a>
						{/if}
					{/each}
				</nav>
				<div class="rail-footer">
						{#if data.user?.roles?.includes('admin')}
							<div class="rail-separator" aria-hidden="true"></div>
							<a
								class="rail-link"
								href="/manage/admin/users"
								aria-label="Admin"
								title="Admin"
								aria-current={data.pathname.startsWith('/manage/admin') ? 'page' : undefined}
							>
								<Icon name="user-plus" size={22} />
							</a>
						{/if}
					</div>
			</aside>
			<main class="main">
				<header class="topbar">
					<SiteSwitcher activeSite={data.site} sites={data.sites} pathname={data.pathname} />
					<div class="topbar-right">
						<AlertBell alertsHref={`${basePath}/alerts`} initialCount={data.unacknowledgedAlertCount ?? 0} />
						<AccountMenu user={data.user} />
					</div>
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
	.tool-frame {
		min-width: 320px;
		min-height: 100vh;
		padding: 10px;
		background: #0b1117;
	}

	.app-shell {
		display: grid;
		grid-template-columns: 50px minmax(0, 1fr);
		height: 100vh;
		overflow: hidden;
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
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 7px;
		margin-top: auto;
		padding: 12px 0;
	}

	.main {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		min-width: 0;
		min-height: 0;
		overflow: hidden;
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

	.topbar-right {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.content {
		--page-pad-y: 18px;
		--page-pad-x: 14px;
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow-y: auto;
		padding: var(--page-pad-y) var(--page-pad-x);
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
