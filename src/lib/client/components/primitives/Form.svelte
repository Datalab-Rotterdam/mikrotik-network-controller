<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		method = 'POST',
		action,
		ariaLabel,
		compact = false
	}: {
		children: Snippet;
		method?: 'GET' | 'POST';
		action?: string;
		ariaLabel?: string;
		compact?: boolean;
	} = $props();
</script>

<form class="form" class:compact {method} {action} aria-label={ariaLabel}>
	{@render children()}
</form>

<style lang="scss">
	.form {
		display: grid;
		gap: 16px;
		margin-top: 24px;
	}

	.form.compact {
		gap: 12px;
		margin-top: 0;
	}
</style>
