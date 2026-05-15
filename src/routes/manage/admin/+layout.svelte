<script lang="ts">
	import { page } from '$app/state';
	import AccountMenu from '$lib/client/components/ui/AccountMenu.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children, data } = $props();

	const adminNav = [
		{
			href: '/manage/admin/users',
			label: 'Users',
			icon: 'M7 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm-3 11c.8-3.3 3.7-5 8-5s7.2 1.7 8 5H4Z'
		},
		{
			href: '/manage/admin/roles',
			label: 'Roles',
			icon: 'M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm0 2.2 7 3.1V11c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6.3l7-3.1Z'
		},
		{
			href: '/manage/admin/api-keys',
			label: 'API Keys',
			icon: 'M7 10.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Zm3.5-5.5a5.5 5.5 0 1 0 3.78 9.53l.22.22V16H17v2h2v-3h-1v-1l-1-1-1.47-1.47A5.5 5.5 0 0 0 10.5 5Z'
		}
	];

	const backHref = $derived(
		data.sites.length > 0 ? `/manage/${data.sites[0].id}` : '/'
	);
</script>

<div class="app-shell">
	<aside class="sidebar-rail">
		<a class="rail-logo" href={backHref} aria-label="Back to sites">
			<img src={favicon} alt="" width="25" height="27" />
		</a>
		<nav class="rail-nav" aria-label="Admin navigation">
			{#each adminNav as item}
				<a
					class="rail-link"
					href={item.href}
					aria-label={item.label}
					title={item.label}
					aria-current={page.url.pathname.startsWith(item.href) ? 'page' : undefined}
				>
					<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
						<path fill="currentColor" d={item.icon} />
					</svg>
				</a>
			{/each}
		</nav>
		<div class="rail-footer">
			<div class="rail-separator" aria-hidden="true"></div>
			<a class="rail-link" href={backHref} aria-label="Back to sites" title="Back to sites">
				<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
					<path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2Z" />
				</svg>
			</a>
		</div>
	</aside>
	<main class="main">
		<header class="topbar">
			<span class="topbar-title">Administration</span>
			<div class="topbar-right">
				{#if data.user}
					<AccountMenu user={data.user} />
				{/if}
			</div>
		</header>
		<section class="content">
			{@render children()}
		</section>
	</main>
</div>

<style>
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

	.topbar-title {
		color: var(--color-muted);
		font-size: 13px;
		font-weight: 600;
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
</style>
