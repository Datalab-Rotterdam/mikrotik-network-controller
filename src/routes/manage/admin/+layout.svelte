<script lang="ts">
	import { page } from '$app/state';

	let { children } = $props();

	const tabs = [
		{ href: '/manage/admin/users', label: 'Users' },
		{ href: '/manage/admin/roles', label: 'Roles' },
		{ href: '/manage/admin/api-keys', label: 'API Keys' }
	];
</script>

<div class="admin-shell">
	<header class="admin-header">
		<h1>Administration</h1>
		<nav class="admin-tabs">
			{#each tabs as tab}
				<a
					href={tab.href}
					class:active={page.url.pathname.startsWith(tab.href)}
				>{tab.label}</a>
			{/each}
		</nav>
	</header>
	<div class="admin-body">
		{@render children()}
	</div>
</div>

<style lang="scss">
	.admin-shell {
		display: grid;
		grid-template-rows: auto 1fr;
		min-height: 0;
	}

	.admin-header {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 0 0 16px;
		border-bottom: 1px solid var(--color-border);
	}

	h1 {
		margin: 0;
		color: var(--color-text);
		font-size: 18px;
		font-weight: 700;
	}

	.admin-tabs {
		display: flex;
		gap: 2px;

		a {
			display: inline-flex;
			align-items: center;
			height: 32px;
			border-radius: 5px;
			padding: 0 12px;
			color: var(--color-muted);
			font-size: 13px;
			font-weight: 600;
			text-decoration: none;

			&:hover {
				background: color-mix(in srgb, var(--color-text) 6%, transparent);
				color: var(--color-text);
			}

			&.active {
				background: color-mix(in srgb, var(--color-brand) 10%, transparent);
				color: var(--color-brand);
			}
		}
	}

	.admin-body {
		padding-top: 20px;
	}
</style>
