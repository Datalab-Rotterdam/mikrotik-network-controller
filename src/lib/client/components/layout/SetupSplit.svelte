<script lang="ts">
	import type { Snippet } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let {
		children,
		imageSrc,
		imageAlt
	}: {
		children: Snippet;
		imageSrc: string;
		imageAlt: string;
	} = $props();
</script>

<main class="setup-page">
	<a class="setup-logo" href="/setup/configure" aria-label="MikroTik Network Controller setup">
		<img src={favicon} alt="" width="34" height="37" />
	</a>

	<section class="setup-shell" aria-labelledby="setup-title">
		<div class="setup-visual">
			<img class="setup-product-image" src={imageSrc} alt={imageAlt} width="600" height="600" />
		</div>

		<div class="setup-workspace">
			{@render children()}
		</div>
	</section>
</main>

<style>
	.setup-page {
		position: relative;
		min-height: 100vh;
		background: var(--color-surface);
	}

	.setup-logo {
		display: grid;
		place-items: center;
		position: relative;
		z-index: 2;
		width: 38px;
		height: 38px;
		margin: 16px;
	}

	.setup-logo img {
		width: 28px;
		height: auto;
	}

	.setup-shell {
		display: grid;
		min-height: calc(100vh - 70px);
		width: 100%;
	}

	.setup-visual {
		display: none;
		place-items: center;
		min-height: 320px;
		padding: 36px 24px;
		background: linear-gradient(180deg, #ffffff 0%, #f8f9f9 100%);
	}

	.setup-product-image {
		width: min(76vw, 560px);
		height: auto;
		object-fit: contain;
		filter: drop-shadow(0 24px 28px rgba(14, 14, 16, 0.12));
	}

	.setup-workspace {
		display: grid;
		place-items: center;
		min-width: 0;
		padding: 40px 24px 28px;
	}

	@media (min-width: 760px) {
		.setup-logo {
			position: absolute;
			top: 18px;
			left: 18px;
			margin: 0;
		}

		.setup-shell {
			min-height: 100vh;
			grid-template-columns: minmax(320px, 2fr) minmax(500px, 3fr);
		}

		.setup-visual {
			display: grid;
			min-height: 100vh;
			border-right: 1px solid #eef0f2;
		}

		.setup-workspace {
			min-height: 100vh;
			align-items: center;
			justify-items: start;
			padding: 80px clamp(48px, 5vw, 80px) 24px;
		}
	}
</style>
