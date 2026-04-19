<script lang="ts">
	import Form from '$lib/client/components/Form.svelte';
	import Input from '$lib/client/components/Input.svelte';

	let { data, form } = $props();

	const controllerName = $derived(form?.controllerName ?? data.setup.controllerName);
	const country = $derived(form?.country ?? data.setup.country);
</script>

<section class="setup-panel" aria-labelledby="setup-title">
	<div class="setup-copy">
		<h1 id="setup-title">Set Local Access Credentials</h1>
		<p>
			Use these credentials to locally access your Network Server.
			<a href="https://mikrotik.com" rel="noreferrer">Learn more</a>.
		</p>
	</div>

	<Form compact ariaLabel="Create administrator">
		{#if form?.message}
			<div class="error-message">{form.message}</div>
		{/if}

		<Input name="controllerName" type="hidden" value={controllerName} />
		<Input name="country" type="hidden" value={country} />

		<Input compact label="Email" name="email" type="email" autocomplete="email" value={form?.email ?? ''} required />
		<Input compact label="Display name" name="displayName" autocomplete="name" value={form?.displayName ?? ''} required />
		<Input compact label="Password" name="password" type="password" autocomplete="new-password" minlength={12} required />
		<Input compact label="Confirm password" name="confirmPassword" type="password" autocomplete="new-password" minlength={12} required />

		<div class="setup-actions">
			<a
				class="button secondary"
				href={`/setup/configure/controller-name?controllerName=${encodeURIComponent(controllerName)}&country=${encodeURIComponent(country)}`}
			>
				Back
			</a>
			<button class="button" type="submit">Finish</button>
		</div>
	</Form>
</section>

<style>
	.setup-panel {
		display: grid;
		gap: 28px;
		width: min(100%, 350px);
		margin: 0 auto;
	}

	.setup-copy {
		display: grid;
		gap: 10px;
	}

	h1 {
		margin: 0;
		color: var(--color-brand);
		font-size: 24px;
		font-weight: 800;
		line-height: 1.18;
	}

	p {
		margin: 0;
		color: var(--color-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	a {
		color: var(--color-link);
	}

	.error-message {
		border: 1px solid #efb8b8;
		border-radius: 6px;
		padding: 10px 12px;
		color: var(--color-danger);
		background: #fff2f2;
	}

	.setup-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 42px;
		border: 1px solid var(--color-brand);
		border-radius: 6px;
		padding: 0 16px;
		color: var(--color-surface);
		background: var(--color-brand);
		font-weight: 750;
		cursor: pointer;
	}

	.button.secondary {
		border-color: var(--color-brand-light);
		color: var(--color-brand);
		background: var(--color-surface);
	}

	@media (min-width: 760px) {
		.setup-panel {
			align-self: center;
			margin: 0;
		}

		.setup-actions {
			position: fixed;
			right: 32px;
			bottom: 24px;
			grid-template-columns: auto auto;
			justify-content: end;
			margin-top: 0;
		}
	}
</style>
