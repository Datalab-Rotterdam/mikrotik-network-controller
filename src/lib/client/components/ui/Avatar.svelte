<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	let {
		name,
		src,
		size = "md",
		alt,
		...rest
	}: {
		name?: string;
		src?: string;
		size?: "sm" | "md" | "lg";
		alt?: string;
	} & HTMLAttributes<HTMLElement> = $props();

	const initials = $derived(
		name
			?.split(/\s+/)
			.map((w) => w[0])
			.join("")
			.toUpperCase()
			.slice(0, 2) ?? "?"
	);
</script>

{#if src}
	<img
		class={`avatar avatar--${size}`}
		{src}
		alt={alt ?? `${name}'s avatar`}
		{...rest}
	/>
{:else}
	<span
		class={`avatar avatar-initials avatar--${size}`}
		role="img"
		aria-label={alt ?? `${name}'s avatar`}
		{...rest}
	>
		{initials}
	</span>
{/if}

<style lang="scss">
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		overflow: hidden;
		background: var(--color-line, #dedfde);
		color: var(--color-muted, #686c6b);
		font-weight: var(--font-weight-semibold, 650);
		line-height: 1;
		flex-shrink: 0;

		&--sm {
			width: 28px;
			height: 28px;
			font-size: 11px;
		}

		&--md {
			width: 36px;
			height: 36px;
			font-size: 13px;
		}

		&--lg {
			width: 44px;
			height: 44px;
			font-size: 16px;
		}

		&.avatar-initials {
			color: var(--color-text, #171717);
			background: var(--color-page, #f3f4f4);
		}

		img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}
	}
</style>
