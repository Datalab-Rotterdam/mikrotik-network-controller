<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	type Role = (typeof data.roles)[number];

	let showCreate = $state(false);
	let editing = $state<Role | null>(null);
</script>

<div class="roles-page">
	<div class="page-toolbar">
		<h2>Roles</h2>
		<button class="invite-btn" onclick={() => { showCreate = !showCreate; editing = null; }} type="button">
			{showCreate ? 'Cancel' : '+ New role'}
		</button>
	</div>

	{#if form?.error}
		<div class="alert-bar error">{form.error}</div>
	{/if}

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => ({ async update({ update }) { await update(); showCreate = false; } })}
			class="role-form"
		>
			<h3>New role</h3>
			<div class="form-row">
				<label>
					<span>Name</span>
					<input name="name" type="text" required placeholder="e.g. network-ops" />
				</label>
				<label>
					<span>Description</span>
					<input name="description" type="text" placeholder="Optional" />
				</label>
			</div>
			<div class="perm-section">
				<span>Permissions</span>
				<div class="perm-grid">
					{#each data.allPermissions as perm}
						<label class="check-label">
							<input type="checkbox" name="permissions" value={perm} />
							{perm}
						</label>
					{/each}
				</div>
			</div>
			<div class="form-actions">
				<button type="submit" class="save-btn">Create role</button>
			</div>
		</form>
	{/if}

	<div class="role-list">
		{#each data.roles as role}
			<div class="role-card">
				<div class="role-header">
					<div>
						<strong class="role-name">{role.name}</strong>
						{#if role.isSystem}
							<span class="system-badge">system</span>
						{/if}
						{#if role.description}
							<p class="role-desc">{role.description}</p>
						{/if}
					</div>
					{#if !role.isSystem}
						<div class="role-btns">
							<button
								class="row-btn"
								onclick={() => (editing = editing?.id === role.id ? null : role)}
								type="button"
							>Edit</button>
							<form method="POST" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={role.id} />
								<button
									type="submit"
									class="danger-btn-sm"
									onclick={(e) => { if (!confirm(`Delete role "${role.name}"?`)) e.preventDefault(); }}
								>Delete</button>
							</form>
						</div>
					{/if}
				</div>
				<div class="perm-tags">
					{#each (role.permissions ?? []) as p}
						<span class="perm-tag">{p}</span>
					{:else}
						<span class="no-perm">No permissions</span>
					{/each}
				</div>

				{#if editing?.id === role.id}
					<form method="POST" action="?/update" use:enhance class="edit-form">
						<input type="hidden" name="id" value={role.id} />
						<div class="form-row">
							<label>
								<span>Name</span>
								<input name="name" type="text" value={role.name} required />
							</label>
							<label>
								<span>Description</span>
								<input name="description" type="text" value={role.description ?? ''} />
							</label>
						</div>
						<div class="perm-section">
							<span>Permissions</span>
							<div class="perm-grid">
								{#each data.allPermissions as perm}
									<label class="check-label">
										<input
											type="checkbox"
											name="permissions"
											value={perm}
											checked={(role.permissions ?? []).includes(perm)}
										/>
										{perm}
									</label>
								{/each}
							</div>
						</div>
						<div class="form-actions">
							<button type="submit" class="save-btn">Save</button>
							<button type="button" class="cancel-btn" onclick={() => (editing = null)}>Cancel</button>
						</div>
					</form>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style lang="scss">
	.roles-page {
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
	}

	.role-form,
	.edit-form {
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
		grid-template-columns: 1fr 1fr;
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

	input[type='text'] {
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

	.perm-section {
		display: grid;
		gap: 8px;

		> span {
			color: var(--color-muted);
			font-size: 12px;
			font-weight: 700;
		}
	}

	.perm-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 6px;
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
		gap: 8px;
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

	.cancel-btn {
		display: inline-flex;
		align-items: center;
		height: 34px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 14px;
		color: var(--color-text);
		background: transparent;
		font-size: 13px;
		cursor: pointer;
	}

	.role-list {
		display: grid;
		gap: 10px;
	}

	.role-card {
		display: grid;
		gap: 10px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		padding: 14px 16px;
		background: var(--color-surface);
	}

	.role-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.role-name {
		color: var(--color-text);
		font-size: 14px;
	}

	.system-badge {
		display: inline-flex;
		align-items: center;
		height: 18px;
		border-radius: 999px;
		padding: 0 7px;
		margin-left: 6px;
		color: var(--color-muted);
		background: color-mix(in srgb, var(--color-muted) 12%, transparent);
		font-size: 10px;
		font-weight: 700;
		vertical-align: middle;
	}

	.role-desc {
		margin: 4px 0 0;
		color: var(--color-muted);
		font-size: 12px;
	}

	.role-btns {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
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
	}

	.perm-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}

	.perm-tag {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 4px;
		padding: 0 7px;
		color: var(--color-muted);
		background: color-mix(in srgb, var(--color-muted) 8%, transparent);
		font-family: ui-monospace, monospace;
		font-size: 11px;
	}

	.no-perm {
		color: var(--color-muted);
		font-size: 12px;
	}
</style>
