<script lang="ts">
	import { enhance } from '$app/forms';

	function extractPlaceholders(content: string): string[] {
		const matches = content.matchAll(/\{\{([^}]+)\}\}/g);
		return [...new Set([...matches].map((m) => m[1].trim()))];
	}

	let { data, form } = $props();

	type Template = (typeof data.templates)[number];
	type Device = (typeof data.devices)[number];

	let templates = $state<Template[]>(data.templates);
	let devices = $state<Device[]>(data.devices);
	let selected = $state<Template | null>(null);
	let showCreate = $state(false);

	// Editor state
	let editName = $state('');
	let editDescription = $state('');
	let editPlatform = $state<'routeros' | 'capsman'>('routeros');
	let editContent = $state('');

	// Deploy state
	let showDeploy = $state(false);
	let deployDeviceId = $state('');
	let deployVariableValues = $state<Record<string, string>>({});
	let deployDryRunResult = $state<{ rendered: string; diff: string } | null>(null);
	let deployLoading = $state(false);
	let deployError = $state('');

	const detectedPlaceholders = $derived(extractPlaceholders(editContent));

	const templateVariables = $derived(selected ? (selected.variables ?? []) : []);

	// RouterOS devices only for deploy target
	const deployableDevices = $derived(
		devices.filter((d: Device) => d.platform === 'routeros' && d.adoptionState === 'fully_managed')
	);

	function selectTemplate(t: Template) {
		selected = t;
		showCreate = false;
		showDeploy = false;
		editName = t.name;
		editDescription = t.description ?? '';
		editPlatform = t.platform as 'routeros' | 'capsman';
		editContent = t.content;
	}

	function startCreate() {
		selected = null;
		showCreate = true;
		showDeploy = false;
		editName = '';
		editDescription = '';
		editPlatform = 'routeros';
		editContent = '';
	}

	function startDeploy() {
		showDeploy = true;
		showCreate = false;
		deployDeviceId = '';
		deployVariableValues = {};
		deployDryRunResult = null;
		deployError = '';
		// Pre-populate defaults
		for (const v of templateVariables) {
			deployVariableValues[v.name] = v.default ?? '';
		}
	}

	function formatDate(d: Date | string | null) {
		if (!d) return '—';
		return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
	}
</script>

<div class="page-root">
	<div class="sidebar">
		<div class="sidebar-header">
			<span class="sidebar-title">Templates</span>
			<button class="create-btn" onclick={startCreate} type="button">+ New</button>
		</div>
		<ul class="template-list">
			{#each templates as t}
				<li>
					<button
						class="template-item"
						class:active={selected?.id === t.id}
						onclick={() => selectTemplate(t)}
						type="button"
					>
						<span class="item-name">{t.name}</span>
						<span class="item-meta">{t.platform}</span>
					</button>
				</li>
			{/each}
			{#if templates.length === 0}
				<li class="list-empty">No templates yet.</li>
			{/if}
		</ul>
	</div>

	<div class="editor-panel">
		{#if showCreate}
			<div class="panel-header">
				<h1>New template</h1>
			</div>
			{#if form?.error}
				<div class="error-bar">{form.error}</div>
			{/if}
			<form
				method="POST"
				action="?/create"
				use:enhance={({ formElement }) => {
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							showCreate = false;
						}
					};
				}}
				class="edit-form"
			>
				<label>
					<span>Name</span>
					<input name="name" type="text" bind:value={editName} required placeholder="e.g. Default OSPF config" />
				</label>
				<label>
					<span>Description</span>
					<input name="description" type="text" bind:value={editDescription} placeholder="Optional" />
				</label>
				<label>
					<span>Platform</span>
					<select name="platform" bind:value={editPlatform}>
						<option value="routeros">RouterOS</option>
						<option value="capsman">CAPsMAN</option>
					</select>
				</label>
				<label class="content-label">
					<span>Content <small class="hint">(use &#123;&#123;variable&#125;&#125; placeholders)</small></span>
					<textarea name="content" rows="18" bind:value={editContent} spellcheck="false" placeholder="# Paste RouterOS export here…"></textarea>
				</label>
				{#if detectedPlaceholders.length > 0}
					<div class="placeholder-hint">
						<span>Detected placeholders:</span>
						{#each detectedPlaceholders as ph}
							<code>{ph}</code>
						{/each}
					</div>
				{/if}
				<div class="form-actions">
					<button type="button" class="cancel-btn" onclick={() => (showCreate = false)}>Cancel</button>
					<button type="submit" class="save-btn">Save template</button>
				</div>
			</form>
		{:else if selected && showDeploy}
			<div class="panel-header">
				<h1>Deploy: {selected.name}</h1>
				<button class="cancel-btn" onclick={() => (showDeploy = false)} type="button">← Back</button>
			</div>
			{#if deployError}
				<div class="error-bar">{deployError}</div>
			{/if}
			{#if form?.error}
				<div class="error-bar">{form.error}</div>
			{/if}
			{#if form?.success}
				<div class="success-bar">{form.message ?? 'Deployment queued.'}</div>
			{/if}

			<form
				method="POST"
				action="?/deploy"
				use:enhance={({ formData }) => {
					deployLoading = true;
					deployError = '';
					return async ({ result, update }) => {
						await update();
						deployLoading = false;
						if (result.type === 'success') {
							showDeploy = false;
						} else if (result.type === 'failure') {
							const failResult = result as { data?: { error?: string } };
							deployError = failResult.data?.error ?? 'Deployment failed';
						}
					};
				}}
				class="edit-form"
			>
				<input type="hidden" name="templateId" value={selected.id} />
				<input type="hidden" name="variableValues" value={JSON.stringify(deployVariableValues)} />

				<label>
					<span>Target device</span>
					<select name="deviceId" bind:value={deployDeviceId} required>
						<option value="">— Select device —</option>
						{#each deployableDevices as d}
							<option value={d.id}>{d.identity ?? d.name} ({d.host})</option>
						{/each}
					</select>
				</label>

				{#if templateVariables.length > 0}
					<div class="deploy-vars-section">
						<strong>Variable values</strong>
						{#each templateVariables as v}
							<label>
								<span>{v.label} {v.required ? '<required/>' : ''}</span>
								<input
									type="text"
									placeholder={v.default ?? v.name}
									value={deployVariableValues[v.name] ?? ''}
									oninput={(e) => {
										deployVariableValues[v.name] = (e.target as HTMLInputElement).value;
									}}
								/>
							</label>
						{/each}
					</div>
				{/if}

				<div class="deploy-actions">
					<button type="button" class="secondary-btn" onclick={() => {
						if (!selected) return;
						const fd = new FormData();
						fd.set('templateId', selected.id);
						fd.set('variableValues', JSON.stringify(deployVariableValues));
						fetch('.', { method: 'POST', body: fd, headers: { 'X-Form-Action': '/dryRun' } })
							.then((r) => r.json())
							.then((j) => {
								if (j.success) {
									deployDryRunResult = { rendered: j.renderedContent, diff: j.diff };
								}
							})
							.catch((e) => {
								deployError = e.message;
							});
					}} disabled={!deployDeviceId}>
						Dry run (diff)
					</button>
					<button type="submit" class="deploy-btn" disabled={!deployDeviceId}>
						{deployLoading ? 'Deploying…' : 'Deploy now'}
					</button>
				</div>
			</form>

			{#if deployDryRunResult}
				<div class="diff-preview">
					<div class="diff-header">Dry-run diff</div>
					<pre class="diff-text">{deployDryRunResult.diff}</pre>
				</div>
			{/if}

			<div class="panel-header">
				<h1>{selected.name}</h1>
				<div class="header-actions">
					<button
						class="deploy-btn-sm"
						onclick={startDeploy}
						type="button"
						disabled={selected.platform !== 'routeros'}
					>
						Deploy →
					</button>
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === 'success') {
									templates = templates.filter((t) => t.id !== selected?.id);
									selected = null;
								}
							};
						}}
					>
						<input type="hidden" name="id" value={selected.id} />
						<button type="submit" class="delete-btn" onclick={(e) => {
							if (!confirm('Delete this template?')) e.preventDefault();
						}}>Delete</button>
					</form>
				</div>
			</div>
			{#if form?.error}
				<div class="error-bar">{form.error}</div>
			{/if}
			{#if form?.success}
				<div class="success-bar">Saved.</div>
			{/if}
			<form
				method="POST"
				action="?/update"
				use:enhance
				class="edit-form"
			>
				<input type="hidden" name="id" value={selected.id} />
				<input type="hidden" name="variables" value={JSON.stringify(selected.variables ?? [])} />
				<label>
					<span>Name</span>
					<input name="name" type="text" bind:value={editName} required />
				</label>
				<label>
					<span>Description</span>
					<input name="description" type="text" bind:value={editDescription} />
				</label>
				<label>
					<span>Platform</span>
					<select name="platform" bind:value={editPlatform}>
						<option value="routeros">RouterOS</option>
						<option value="capsman">CAPsMAN</option>
					</select>
				</label>
				<label class="content-label">
					<span>Content <small class="hint">(use &#123;&#123;variable&#125;&#125; placeholders)</small></span>
					<textarea name="content" rows="18" bind:value={editContent} spellcheck="false"></textarea>
				</label>
				{#if detectedPlaceholders.length > 0}
					<div class="placeholder-hint">
						<span>Detected placeholders:</span>
						{#each detectedPlaceholders as ph}
							<code>{ph}</code>
						{/each}
					</div>
				{/if}

				{#if (selected.variables ?? []).length > 0}
					<div class="variables-section">
						<strong>Variable definitions</strong>
						<table class="var-table">
							<thead>
								<tr>
									<th>Name</th>
									<th>Label</th>
									<th>Type</th>
									<th>Default</th>
									<th>Required</th>
								</tr>
							</thead>
							<tbody>
								{#each selected.variables ?? [] as v}
									<tr>
										<td><code>{v.name}</code></td>
										<td>{v.label}</td>
										<td>{v.type}</td>
										<td>{v.default ?? '—'}</td>
										<td>{v.required ? 'Yes' : 'No'}</td>
									</tr>
								{/each}
							</tbody>
						</table>
						<p class="var-hint">Variable metadata is auto-extracted from placeholders. Edit the JSON in the API or re-save to refresh.</p>
					</div>
				{/if}

				<div class="meta-row">
					<span>Created {formatDate(selected.createdAt)}</span>
					<span>Updated {formatDate(selected.updatedAt)}</span>
				</div>
				<div class="form-actions">
					<button type="submit" class="save-btn">Save changes</button>
				</div>
			</form>
		{:else}
			<div class="empty-panel">
				<p>Select a template to edit, or create a new one.</p>
				<button class="create-btn-large" onclick={startCreate} type="button">+ New template</button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.page-root {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		gap: 0;
		height: calc(100vh - var(--topbar-height, 54px) - 28px);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-surface);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		border-right: 1px solid var(--color-border);
		background: var(--color-page);
		overflow: hidden;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 14px;
		border-bottom: 1px solid var(--color-border);
	}

	.sidebar-title {
		color: var(--color-text);
		font-size: 13px;
		font-weight: 800;
	}

	.create-btn {
		display: inline-flex;
		align-items: center;
		height: 28px;
		border: 1px solid var(--color-brand);
		border-radius: 4px;
		padding: 0 9px;
		color: var(--color-brand);
		background: transparent;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-brand) 8%, transparent);
		}
	}

	.template-list {
		flex: 1;
		list-style: none;
		margin: 0;
		padding: 6px;
		overflow-y: auto;
	}

	.template-item {
		display: grid;
		width: 100%;
		border: none;
		border-radius: 5px;
		padding: 8px 10px;
		color: var(--color-text);
		background: transparent;
		font-size: 13px;
		text-align: left;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-text) 6%, transparent);
		}

		&.active {
			background: color-mix(in srgb, var(--color-brand) 12%, transparent);
			color: var(--color-brand);
		}
	}

	.item-name {
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		margin-top: 2px;
		color: var(--color-muted);
		font-size: 11px;
	}

	.list-empty {
		padding: 16px 10px;
		color: var(--color-muted);
		font-size: 13px;
	}

	.editor-panel {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 20px 24px;
		gap: 16px;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}

	h1 {
		margin: 0;
		color: var(--color-text);
		font-size: 18px;
		font-weight: 700;
	}

	.edit-form {
		display: grid;
		gap: 14px;
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

	.content-label {
		gap: 6px;
	}

	input[type='text'],
	select {
		height: 36px;
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

	textarea {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 10px;
		color: var(--color-text);
		background: var(--color-surface);
		font-family: ui-monospace, monospace;
		font-size: 12px;
		line-height: 1.55;
		resize: vertical;
		outline: none;

		&:focus {
			border-color: var(--color-brand);
		}
	}

	.hint {
		color: var(--color-muted);
		font-size: 11px;
		font-weight: 400;
	}

	.placeholder-hint {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-brand) 5%, transparent);
		font-size: 12px;

		span {
			color: var(--color-muted);
			font-weight: 600;
		}

		code {
			border: 1px solid var(--color-border);
			border-radius: 3px;
			padding: 1px 5px;
			color: var(--color-brand);
			background: var(--color-surface);
			font-size: 11px;
		}
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.save-btn {
		display: inline-flex;
		align-items: center;
		height: 36px;
		border: none;
		border-radius: 4px;
		padding: 0 16px;
		color: #fff;
		background: var(--color-brand);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			filter: brightness(1.08);
		}
	}

	.cancel-btn {
		display: inline-flex;
		align-items: center;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 16px;
		color: var(--color-text);
		background: transparent;
		font-size: 13px;
		cursor: pointer;
	}

	.delete-btn {
		display: inline-flex;
		align-items: center;
		height: 32px;
		border: 1px solid var(--color-danger);
		border-radius: 4px;
		padding: 0 12px;
		color: var(--color-danger);
		background: transparent;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		}
	}

	.variables-section {
		display: grid;
		gap: 10px;

		strong {
			color: var(--color-text);
			font-size: 13px;
		}
	}

	.var-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;

		th,
		td {
			height: 36px;
			border-bottom: 1px solid var(--color-border);
			padding: 0 10px;
			color: var(--color-text);
			text-align: left;
		}

		th {
			font-weight: 700;
			color: var(--color-muted);
		}

		code {
			color: var(--color-brand);
			font-size: 11px;
		}
	}

	.var-hint {
		margin: 0;
		color: var(--color-muted);
		font-size: 11px;
	}

	.meta-row {
		display: flex;
		gap: 20px;
		color: var(--color-muted);
		font-size: 11px;
	}

	.error-bar {
		padding: 8px 12px;
		border: 1px solid var(--color-danger);
		border-radius: 4px;
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		font-size: 13px;
	}

	.success-bar {
		padding: 8px 12px;
		border: 1px solid var(--color-success);
		border-radius: 4px;
		color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 8%, transparent);
		font-size: 13px;
	}

	.empty-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 16px;
		color: var(--color-muted);
		font-size: 14px;
		text-align: center;

		p {
			margin: 0;
		}
	}

	.create-btn-large {
		display: inline-flex;
		align-items: center;
		height: 36px;
		border: 1px solid var(--color-brand);
		border-radius: 4px;
		padding: 0 14px;
		color: var(--color-brand);
		background: transparent;
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;

		&:hover {
			background: color-mix(in srgb, var(--color-brand) 8%, transparent);
		}
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.deploy-btn-sm {
		display: inline-flex;
		align-items: center;
		height: 32px;
		border: 1px solid var(--color-success);
		border-radius: 4px;
		padding: 0 12px;
		color: var(--color-success);
		background: transparent;
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;

		&:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-success) 8%, transparent);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.deploy-actions {
		display: flex;
		justify-content: flex-end;
		gap: 10px;
	}

	.secondary-btn {
		display: inline-flex;
		align-items: center;
		height: 36px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 0 14px;
		color: var(--color-text);
		background: transparent;
		font-size: 13px;
		cursor: pointer;

		&:hover:not(:disabled) {
			background: color-mix(in srgb, var(--color-text) 5%, transparent);
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.deploy-btn {
		display: inline-flex;
		align-items: center;
		height: 36px;
		border: none;
		border-radius: 4px;
		padding: 0 20px;
		color: #fff;
		background: var(--color-success);
		font-size: 13px;
		font-weight: 700;
		cursor: pointer;

		&:hover:not(:disabled) {
			filter: brightness(1.08);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.deploy-vars-section {
		display: grid;
		gap: 12px;
		padding: 12px;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: color-mix(in srgb, var(--color-page) 50%, transparent);

		strong {
			color: var(--color-text);
			font-size: 13px;
		}

		label {
			display: grid;
			grid-template-columns: 160px 1fr;
			align-items: center;
			gap: 10px;

			span {
				color: var(--color-muted);
				font-size: 12px;
				font-weight: 600;

				re required {
					color: var(--color-danger);
					font-weight: 400;
				}
			}
		}
	}

	.diff-preview {
		border: 1px solid var(--color-border);
		border-radius: 6px;
		overflow: hidden;
		background: var(--color-page);
	}

	.diff-header {
		padding: 8px 12px;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-muted);
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.diff-text {
		padding: 12px;
		margin: 0;
		overflow-x: auto;
		color: var(--color-text);
		font-family: ui-monospace, monospace;
		font-size: 11px;
		line-height: 1.55;
		white-space: pre;
	}
</style>
