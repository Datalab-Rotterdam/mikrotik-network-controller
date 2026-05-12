<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";

	let {
		size = "md",
		...rest
	}: {
		size?: "sm" | "md" | "lg";
	} & HTMLButtonAttributes = $props();
</script>

<button
	class="icon-btn icon-btn--{size}"
	type="button"
	{...rest}
></button>

<style lang="scss">
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		cursor: pointer;
		color: var(--color-muted, #686c6b);
		border-radius: var(--radius-sm, 3px);
		transition:
			color 0.15s ease,
			background-color 0.15s ease;

		&:hover {
			color: var(--color-text, #171717);
			background: rgba(0, 0, 0, 0.05);
		}

		&--sm {
			width: 28px;
			height: 28px;
			font-size: 14px;
		}

		&--md {
			width: 36px;
			height: 36px;
			font-size: 18px;
		}

		&--lg {
			width: 44px;
			height: 44px;
			font-size: 22px;
		}
	}
</style>
