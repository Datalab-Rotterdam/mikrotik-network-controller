<script lang="ts">
	import { page } from '$app/state';
	import Form from '$lib/client/components/Form.svelte';
	import Input from '$lib/client/components/Input.svelte';

	const countries = ['Netherlands', 'Belgium', 'Germany', 'United Kingdom', 'United States'];
	const controllerName = $derived(page.url.searchParams.get('controllerName') ?? 'Default');
	const selectedCountry = $derived(page.url.searchParams.get('country') ?? 'Netherlands');
</script>

<section class="setup-panel" aria-labelledby="setup-title">
	<div class="setup-copy">
		<h1 id="setup-title">Name Your MikroTik Network Server</h1>
		<p>
			Centrally manage all of your servers at <a href="https://mikrotik.com" rel="noreferrer">mikrotik.com</a>.
		</p>
	</div>

	<Form compact method="GET" action="./advanced-access" ariaLabel="Name controller">
		<Input compact label="Server name" name="controllerName" autocomplete="organization" value={controllerName} required />

		<label class="field">
			<span>Country / region</span>
			<select name="country" required>
				{#each countries as country}
					<option value={country} selected={country === selectedCountry}>{country}</option>
				{/each}
			</select>
		</label>

		<label class="check-field">
			<input name="acceptedTerms" type="checkbox" value="yes" required />
			<span>
				I agree to the <a href="https://mikrotik.com" rel="noreferrer">End User License Agreement</a>
				and <a href="https://mikrotik.com" rel="noreferrer">Terms of Service</a>.
			</span>
		</label>

		<div class="setup-footer">
			<a class="setup-link" href="/setup/configure/controller-name">Restore Server from a Backup</a>
			<button class="button" type="submit">Next</button>
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

	.field {
		display: grid;
		gap: 4px;
		color: #72777a;
		font-size: 12px;
		font-weight: 500;
	}

	.field select {
		width: 100%;
		min-height: 31px;
		border: 1px solid #f0f1f3;
		border-radius: 3px;
		padding: 5px 10px;
		color: var(--color-brand);
		background: #f4f5f6;
	}

	.field select:focus {
		border-color: var(--color-brand);
		outline: 3px solid rgba(14, 14, 16, 0.14);
	}

	.check-field {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		color: var(--color-brand);
		font-size: 14px;
		line-height: 1.45;
	}

	.check-field input {
		flex: 0 0 auto;
		margin-top: 3px;
	}

	.setup-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-top: 22px;
	}

	.setup-link {
		font-size: 14px;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 66px;
		min-height: 42px;
		border: 1px solid var(--color-brand);
		border-radius: 6px;
		padding: 0 16px;
		color: var(--color-surface);
		background: var(--color-brand);
		font-weight: 750;
		cursor: pointer;
	}

	@media (min-width: 760px) {
		.setup-panel {
			align-self: center;
			margin: 0;
		}

		.setup-footer {
			position: fixed;
			right: 32px;
			bottom: 24px;
			left: calc(40vw + 64px);
			margin-top: 0;
		}
	}
</style>
