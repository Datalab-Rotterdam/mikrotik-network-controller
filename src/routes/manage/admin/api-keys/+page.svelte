<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showCreate = $state(false);
	let copied = $state(false);

	function formatDate(d: Date | string | null | undefined) {
		if (!d) return '—';
		return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}

	function isExpired(d: Date | string | null | undefined) {
		if (!d) return false;
		return new Date(d) < new Date();
	}

	async function copyKey(raw: string) {
		await navigator.clipboard.writeText(raw);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="keys-page">
	<div class="page-toolbar">
		<h2>API Keys</h2>
		<button
			class="create-btn"
			onclick={() => (showCreate = !showCreate)}
			type="button"
		>{showCreate ? 'Cancel' : '+ New key'}</button>
	</div>

	{#if form?.error}
		<div class="alert-bar error">{form.error}</div>
	{/if}

	{#if form?.success && form?.createdRaw}
		<div class="alert-bar key-reveal">
			<div class="reveal-header">
				<strong>Key created: {form.createdName}</strong>
				<span class="reveal-note">Copy now — shown once only.</span>
			</div>
			<div class="key-row">
				<code class="key-token">{form.createdRaw}</code>
				<button class="copy-btn" type="button" onclick={() => copyKey(form.createdRaw!)}>
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
		</div>
	{/if}

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			use:enhance={() => ({ async update({ update }) { await update(); showCreate = false; } })}
			class="create-form"
		>
			<h3>New API key</h3>
			<div class="form-row">
				<label>
					<span>Key name</span>
					<input name="name" type="text" required placeholder="e.g. automation-script" />
				</label>
				<label>
					<span>Owner</span>
					<select name="userId">
						{#each data.users as u}
							<option value={u.id}>{u.displayName} ({u.email})</option>
						{/each}
					</select>
				</label>
				<label>
					<span>Expires (optional)</span>
					<input name="expiresAt" type="date" />
				</label>
			</div>
			<div class="form-actions">
				<button type="submit" class="save-btn">Generate key</button>
			</div>
		</form>
	{/if}

	<table class="key-table">
		<thead>
			<tr>
				<th>Name</th>
				<th>Owner</th>
				<th>Last used</th>
				<th>Expires</th>
				<th>Created</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each data.keys as key}
				<tr class:expired-row={isExpired(key.expiresAt)}>
					<td><strong>{key.name}</strong></td>
					<td class="owner-cell">
						{#if key.userDisplay}
							<span>{key.userDisplay}</span>
							<span class="email-sub">{key.userEmail}</span>
						{:else}
							<span class="muted">—</span>
						{/if}
					</td>
					<td>{formatDate(key.lastUsedAt)}</td>
					<td>
						{#if key.expiresAt}
							<span class:expired-pill={isExpired(key.expiresAt)} class:expiry-pill={!isExpired(key.expiresAt)}>
								{formatDate(key.expiresAt)}
							</span>
						{:else}
							<span class="muted">Never</span>
						{/if}
					</td>
					<td>{formatDate(key.createdAt)}</td>
					<td class="actions-cell">
						<form method="POST" action="?/revoke" use:enhance>
							<input type="hidden" name="id" value={key.id} />
							<button
								type="submit"
								class="danger-btn-sm"
								onclick={(e) => { if (!confirm(`Revoke key "${key.name}"?`)) e.preventDefault(); }}
							>Revoke</button>
						</form>
					</td>
				</tr>
			{:else}
				<tr>
					<td colspan="6" class="empty-row">No API keys yet.</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style lang="scss">
	.keys-page {
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

	.create-btn {
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

		&.key-reveal {
			display: grid;
			gap: 8px;
			border: 1px solid var(--color-brand);
			background: color-mix(in srgb, var(--color-brand) 6%, transparent);
		}
	}

	.reveal-header {
		display: flex;
		align-items: center;
		gap: 12px;

		strong {
			color: var(--color-text);
		}
	}

	.reveal-note {
		color: var(--color-muted);
		font-size: 12px;
	}

	.key-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.key-token {
		flex: 1;
		padding: 6px 10px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-surface);
		color: var(--color-text);
		font-size: 12px;
		font-family: ui-monospace, monospace;
		overflow-x: auto;
		white-space: nowrap;
	}

	.copy-btn {
		display: inline-flex;
		align-items: center;
		height: 30px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-text);
		background: transparent;
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
	}

	.create-form {
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
		grid-template-columns: 1fr 1fr 1fr;
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

	input[type='text'],
	input[type='date'],
	select {
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

	.form-actions {
		display: flex;
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

	.key-table {
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

	.expired-row td {
		opacity: 0.5;
	}

	.owner-cell {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1px;
	}

	.email-sub {
		color: var(--color-muted);
		font-size: 11px;
	}

	.muted {
		color: var(--color-muted);
	}

	.expiry-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 999px;
		padding: 0 8px;
		color: var(--color-muted);
		background: color-mix(in srgb, var(--color-muted) 10%, transparent);
		font-size: 11px;
	}

	.expired-pill {
		display: inline-flex;
		align-items: center;
		height: 20px;
		border-radius: 999px;
		padding: 0 8px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		font-size: 11px;
		font-weight: 700;
	}

	.actions-cell {
		text-align: right;
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

	.empty-row {
		color: var(--color-muted);
		text-align: center;
		height: 60px;
	}
</style>
