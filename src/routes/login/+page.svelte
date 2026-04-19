<script lang="ts">
	let { form } = $props();
</script>

<main class="auth-page">
	<section class="auth-panel">
		<h1>Sign In</h1>
		<p>Access the local MikroTik controller.</p>

		<form class="form-stack" method="POST">
			{#if form?.message}
				<div class="error-message">{form.message}</div>
			{/if}

			<label class="field">
				<span>Email</span>
				<input name="email" type="email" autocomplete="email" value={form?.email ?? ''} required />
			</label>

			<label class="field">
				<span>Password</span>
				<input name="password" type="password" autocomplete="current-password" required />
			</label>

			<button class="button" type="submit">Sign in</button>
		</form>
	</section>
</main>
