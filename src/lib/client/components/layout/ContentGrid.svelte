<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	let {
		children,
		...rest
	}: {
		children?: Snippet;
  } & HTMLAttributes<HTMLSpanElement> = $props();
</script>

{#if children}
	<span class="content-grid">{@render children()}</span>
{:else}
	<span class="content-grid" {...rest}></span>
{/if}

<style lang="scss">
	.content-grid {
		display: grid;
		gap: 14px;
	}
</style>
