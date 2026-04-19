<script lang="ts">
	import Form from '$lib/client/components/Form.svelte';
	import Input from '$lib/client/components/Input.svelte';

	let { form } = $props();
</script>

<main class="auth-page">
	<section class="auth-panel clean" aria-labelledby="signin-title">
		<div class="auth-copy">
			<h1 id="signin-title">Sign in</h1>
			<p>Access your local MikroTik Network Server.</p>
		</div>

		<Form ariaLabel="Sign in">
			{#if form?.message}
				<div class="error-message">{form.message}</div>
			{/if}

			<Input compact label="Email" name="email" type="email" autocomplete="email" value={form?.email ?? ''} required />
			<Input compact label="Password" name="password" type="password" autocomplete="current-password" required />

			<button class="button" type="submit">Sign in</button>
		</Form>
	</section>
</main>

<style lang="scss">
	.auth-page {
		display: grid;
		min-height: 100vh;
		place-items: center;
		padding: 32px 16px;
		background: var(--color-page);

		.auth-panel {
			width: min(100%, 360px);
			padding: 28px;
			background: var(--color-surface);
		}

		.auth-copy {
			display: grid;
			gap: 10px;
		}

	}

	h1 {
		margin: 0;
		font-size: 28px;
		line-height: 1.15;
	}

	p {
		margin: 0;
		color: var(--color-muted);
		line-height: 1.5;
	}

	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		justify-self: end;
		min-width: 72px;
		min-height: 42px;
		border: 1px solid var(--color-brand);
		border-radius: 6px;
		padding: 0 16px;
		color: var(--color-surface);
		background: var(--color-brand);
		font-weight: 750;
		cursor: pointer;
	}

	.error-message {
		border: 1px solid #efb8b8;
		border-radius: 6px;
		padding: 10px 12px;
		color: var(--color-danger);
		background: #fff2f2;
	}
</style>
