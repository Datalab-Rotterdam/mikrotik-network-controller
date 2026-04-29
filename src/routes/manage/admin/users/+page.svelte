<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	type UserRow = (typeof data.users)[number];

	let showInvite = $state(false);
	let selectedUser = $state<UserRow | null>(null);
	let resetTarget = $state<UserRow | null>(null);

	function formatDate(d: Date | string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<div class="users-page">
	<div class="page-toolbar">
		<h2>Users</h2>
		<button class="invite-btn" onclick={() => (showInvite = !showInvite)} type="button">
			{showInvite ? 'Cancel' : '+ Invite user'}
		</button>
	</div>

	{#if form?.error}
		<div class="alert-bar error">{form.error}</div>
	{/if}
	{#if form?.success && form?.message}
		<div class="alert-bar success">{form.message}</div>
	{/if}

	{#if showInvite}
		<form
			method="POST"
			action="?/invite"
			use:enhance={() => ({ async update({ update }) { await update(); showInvite = false; } })}
			class="invite-form"
		>
			<h3>Invite user</h3>
			<div class="form-row">
				<label>
					<span>Email</span>
					<input name="email" type="email" required placeholder="user@example.com" />
				</label>
				<label>
					<span>Display name</span>
					<input name="displayName" type="text" required placeholder="Jane Smith" />
				</label>
				<label>
					<span>Temporary password</span>
					<input name="password" type="password" required minlength="8" placeholder="Min 8 chars" />
				</label>
			</div>
			<div class="role-picker">
				<span>Roles</span>
				<div class="role-checks">
					{#each data.roles as role}
						<label class="check-label">
							<input type="checkbox" name="roleIds" value={role.id} />
							{role.name}
						</label>
					{/each}
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="save-btn">Send invite</button>
			</div>
		</form>
	{/if}

	<table class="user-table">
		<thead>
			<tr>
				<th>Name</th>
				<th>Email</th>
				<th>Roles</th>
				<th>Last login</th>
				<th>Status</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.users as user}
				<tr class:disabled-row={user.disabledAt}>
					<td><strong>{user.displayName}</strong></td>
					<td>{user.email}</td>
					<td>
						<div class="role-tags">
							{#each user.roleNames as r}
								<span class="role-tag">{r}</span>
							{:else}
								<span class="no-role">—</span>
							{/each}
						</div>
					</td>
					<td>{formatDate(user.lastLoginAt)}</td>
					<td>
						{#if user.disabledAt}
							<span class="status-pill disabled">Disabled</span>
						{:else}
							<span class="status-pill active">Active</span>
						{/if}
					</td>
					<td class="actions-cell">
						<button
							class="row-btn"
							onclick={() => (selectedUser = selectedUser?.id === user.id ? null : user)}
							type="button"
						>Manage</button>
					</td>
				</tr>
				{#if selectedUser?.id === user.id}
					<tr class="manage-row">
						<td colspan="6">
							<div class="manage-panel">
								<form method="POST" action="?/setRoles" use:enhance class="manage-section">
									<input type="hidden" name="userId" value={user.id} />
									<strong>Roles</strong>
									<div class="role-checks">
										{#each data.roles as role}
											<label class="check-label">
												<input
													type="checkbox"
													name="roleIds"
													value={role.id}
													checked={user.roleNames.includes(role.name)}
												/>
												{role.name}
											</label>
										{/each}
									</div>
									<button type="submit" class="save-btn-sm">Save roles</button>
								</form>

								<div class="manage-section">
									<strong>Password</strong>
									{#if resetTarget?.id === user.id}
										<form method="POST" action="?/resetPassword" use:enhance>
											<input type="hidden" name="userId" value={user.id} />
											<input type="password" name="password" minlength="8" placeholder="New password" required />
											<button type="submit" class="save-btn-sm">Set password</button>
											<button type="button" class="cancel-btn-sm" onclick={() => (resetTarget = null)}>Cancel</button>
										</form>
									{:else}
										<button class="row-btn" onclick={() => (resetTarget = user)} type="button">Reset password</button>
									{/if}
								</div>

								<div class="manage-section">
									<strong>Access</strong>
									{#if user.disabledAt}
										<form method="POST" action="?/enable" use:enhance>
											<input type="hidden" name="userId" value={user.id} />
											<button type="submit" class="save-btn-sm">Enable account</button>
										</form>
									{:else}
										<form method="POST" action="?/disable" use:enhance>
											<input type="hidden" name="userId" value={user.id} />
											<button type="submit" class="danger-btn-sm">Disable account</button>
										</form>
									{/if}
								</div>

								<div class="manage-section">
									<strong>Remove</strong>
									<form method="POST" action="?/remove" use:enhance>
										<input type="hidden" name="userId" value={user.id} />
										<button
											type="submit"
											class="danger-btn-sm"
											onclick={(e) => { if (!confirm(`Delete ${user.displayName}?`)) e.preventDefault(); }}
										>Delete user</button>
									</form>
								</div>
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</div>

<style lang="scss">
	.users-page {
		display: grid;
		gap: 16px;
	}

	.page-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;

		h2 {
			margin: 0;
			color: var(--color-text);
			font-size: 15px;
			font-weight: 700;
		}
	}

	.invite-btn {
		display: inline-flex;
		align-items: center;
		height: 32px;
		border: 1px solid var(--color-brand);
		border-radius: 4px;
		padding: 0 12px;
		color: var(--color-brand);
		background: transparent;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-brand) 8%, transparent);
		}
	}

	.alert-bar {
		padding: 10px 14px;
		border-radius: 5px;
		font-size: 13px;

		&.error {
			border: 1px solid var(--color-danger);
			color: var(--color-danger);
			background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		}

		&.success {
			border: 1px solid var(--color-success);
			color: var(--color-success);
			background: color-mix(in srgb, var(--color-success) 8%, transparent);
		}
	}

	.invite-form {
		display: grid;
		gap: 14px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 16px;
		background: var(--color-surface);

		h3 {
			margin: 0;
			color: var(--color-text);
			font-size: 14px;
			font-weight: 700;
		}
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
	}

	label {
		display: grid;
		gap: 5px;

		span {
			color: var(--color-muted);
			font-size: 12px;
			font-weight: 700;
		}
	}

	input[type='email'],
	input[type='text'],
	input[type='password'] {
		height: 34px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-text);
		background: var(--color-surface);
		font-size: 13px;
		outline: none;

		&:focus {
			border-color: var(--color-brand);
		}
	}

	.role-picker {
		display: grid;
		gap: 8px;

		> span {
			color: var(--color-muted);
			font-size: 12px;
			font-weight: 700;
		}
	}

	.role-checks {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.check-label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--color-text);
		font-size: 13px;
		cursor: pointer;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		height: 34px;
		border: none;
		border-radius: 4px;
		padding: 0 14px;
		color: #fff;
		background: var(--color-brand);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;
	}

	.user-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;

		th,
		td {
			height: 44px;
			border-bottom: 1px solid var(--color-border);
			padding: 0 12px;
			color: var(--color-text);
			text-align: left;
		}

		th {
			color: var(--color-muted);
			font-size: 12px;
			font-weight: 700;
		}

		tr:last-child td {
			border-bottom: 0;
		}
	}

	.disabled-row td {
		opacity: 0.5;
	}

	.role-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.role-tag {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 999px;
		padding: 0 8px;
		color: var(--color-brand);
		background: color-mix(in srgb, var(--color-brand) 10%, transparent);
		font-size: 11px;
		font-weight: 700;
	}

	.no-role {
		color: var(--color-muted);
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 999px;
		padding: 0 8px;
		font-size: 11px;
		font-weight: 700;

		&.active {
			color: var(--color-success);
			background: color-mix(in srgb, var(--color-success) 10%, transparent);
		}

		&.disabled {
			color: var(--color-muted);
			background: color-mix(in srgb, var(--color-muted) 10%, transparent);
		}
	}

	.actions-cell {
		text-align: right;
	}

	.row-btn {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-text);
		background: transparent;
		font-size: 12px;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-text) 6%, transparent);
		}
	}

	.manage-row td {
		padding: 0;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-page);
	}

	.manage-panel {
		display: flex;
		gap: 24px;
		padding: 14px 16px;
		flex-wrap: wrap;
	}

	.manage-section {
		display: grid;
		gap: 8px;
		min-width: 160px;

		strong {
			color: var(--color-muted);
			font-size: 11px;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		form {
			display: grid;
			gap: 6px;
		}
	}

	.save-btn-sm {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: none;
		border-radius: 4px;
		padding: 0 10px;
		color: #fff;
		background: var(--color-brand);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.cancel-btn-sm {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-text);
		background: transparent;
		font-size: 12px;
		cursor: pointer;
	}

	.danger-btn-sm {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: 1px solid var(--color-danger);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-danger);
		background: transparent;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		}
	}
</style>
