<script lang="ts">
	import Dropdown from './Dropdown.svelte';

	type User = {
		email: string;
		displayName: string;
	};

	let { user }: { user: User } = $props();
	const initial = $derived(user.displayName.slice(0, 1).toUpperCase());
</script>

<Dropdown rootClass="account-menu" panelClass="account-panel" align="right" ariaLabel="Account menu" title={user.email}>
	{#snippet trigger()}
		<span class="account-avatar">{initial}</span>
	{/snippet}

	<div class="account-content">
		<div class="account-identity">
			<strong>{user.displayName}</strong>
			<span>{user.email}</span>
		</div>

		<form method="POST" action="/manage/account/logout">
			<button type="submit">
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					<path
						fill="currentColor"
						d="M10 17v-2h4v-2h-4v-2l-4 3 4 3Zm-6 4h8v-2H6V5h6V3H4v18Zm11-4 5-5-5-5v3h-5v4h5v3Z"
					/>
				</svg>
				Sign out
			</button>
		</form>
	</div>
</Dropdown>

<style lang="scss">
	:global(.account-menu summary) {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border: 1px solid transparent;
		border-radius: 50%;
		color: var(--color-brand-muted);
		background: transparent;
		cursor: pointer;
	}

	.account-avatar {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-brand-light);
		border-radius: 50%;
		font-size: 12px;
		font-weight: 800;
	}

	:global(.account-menu[open] summary),
	:global(.account-menu summary:hover) {
		border-color: #dce4e9;
		background: #fbfdff;
	}

	:global(.account-panel) {
		width: 260px;
	}

	.account-identity {
		display: grid;
		gap: 4px;
		padding: 12px;
		border-bottom: 1px solid #f0f2f4;

		strong {
			color: #323a40;
			font-size: 13px;
		}

		span {
			color: #7d8790;
			font-size: 12px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	form {
		padding: 8px;
	}

	button {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-height: 36px;
		border: 0;
		border-radius: 4px;
		padding: 0 10px;
		color: #323a40;
		background: transparent;
		font: inherit;
		font-size: 13px;
		cursor: pointer;

		&:hover {
			color: var(--color-link);
			background: #fbfdff;
		}
	}

	@media (max-width: 520px) {
		:global(.account-panel) {
			width: min(100vw - 70px, 260px);
		}
	}
</style>
