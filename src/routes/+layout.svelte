<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';

	let { children, data } = $props();

	const navItems = [
		{ href: '/sites', label: 'Sites', group: 'site', icon: 'M12 2a10 10 0 0 0-3 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1 2.9.8.1-.6.3-1 .6-1.3-2.2-.3-4.5-1.1-4.5-4.9 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.5 9.5 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.4.2 2.5.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.5 4.9.4.3.7.9.7 1.8V21c0 .3.2.6.7.5A10 10 0 0 0 12 2Z' },
		{ href: '/', label: 'Dashboard', icon: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z' },
		{ href: '/topology', label: 'Topology', icon: 'M7 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm10 10a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM7 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm2.6-7.2 4.8 6.4 1.6-1.2-4.8-6.4-1.6 1.2Zm.4 9.2h4v-2h-4v2Z' },
		{ href: '/devices', label: 'Devices', icon: 'M4 5h14v10H4V5Zm2 2v6h10V7H6Zm-3 11h18v2H3v-2Zm17-9h1v5h-1V9Z' },
		{ href: '/clients', label: 'Clients', icon: 'M7 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-3 11c.8-3.3 3.7-5 8-5s7.2 1.7 8 5H4Z' },
		{ href: '/syslog', label: 'Syslog', group: 'management', icon: 'M5 3h14v18H5V3Zm3 4h8V5H8v2Zm0 4h8V9H8v2Zm0 4h6v-2H8v2Zm0 4h8v-2H8v2Z' },
		{ href: '/settings', label: 'Settings', icon: 'M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.6-1.5L14 2h-4l-.4 3a8 8 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5A9 9 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.6 1.5l.4 3h4l.4-3a8 8 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if data.user}
	<div class="app-shell">
		<aside class="sidebar-rail">
			<a class="rail-logo" href="/sites" aria-label="Sites">
				<span></span>
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
			<div class="rail-footer">
				<form method="POST" action="/logout">
					<button class="rail-link" type="submit" aria-label="Sign out" title="Sign out">
						<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
							<path
								fill="currentColor"
								d="M10 17v-2h4v-2h-4v-2l-4 3 4 3Zm-6 4h8v-2H6V5h6V3H4v18Zm11-4 5-5-5-5v3h-5v4h5v3Z"
							/>
						</svg>
					</button>
				</form>
			</div>
		</aside>
		<main class="main">
			<header class="topbar">
				<div class="topbar-title">Network</div>
				<div class="topbar-user" title={data.user.email} aria-label={data.user.displayName}>
					{data.user.displayName.slice(0, 1).toUpperCase()}
				</div>
			</header>
			<section class="content">
				{@render children()}
			</section>
		</main>
	</div>
{:else}
	{@render children()}
{/if}
