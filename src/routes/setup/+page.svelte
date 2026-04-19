<script lang="ts">
	let { form } = $props();
</script>

<main class="auth-page">
	<section class="auth-panel">
		<h1>Set Up Controller</h1>
		<p>Create the first local administrator account for this controller.</p>

		<form class="form-stack" method="POST">
			{#if form?.message}
				<div class="error-message">{form.message}</div>
			{/if}

			<label class="field">
				<span>Email</span>
				<input name="email" type="email" autocomplete="email" value={form?.email ?? ''} required />
			</label>

			<label class="field">
				<span>Display name</span>
				<input name="displayName" autocomplete="name" value={form?.displayName ?? ''} required />
			</label>

			<label class="field">
				<span>Password</span>
				<input name="password" type="password" autocomplete="new-password" minlength="12" required />
			</label>

			<label class="field">
				<span>Confirm password</span>
				<input
					name="confirmPassword"
					type="password"
					autocomplete="new-password"
					minlength="12"
					required
				/>
			</label>

			<button class="button" type="submit">Create administrator</button>
		</form>
	</section>
</main>
