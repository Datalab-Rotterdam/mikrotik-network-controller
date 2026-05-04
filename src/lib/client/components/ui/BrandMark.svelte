<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
</script>

<a class="brand-mark" href="/" aria-label="MikroTik Network Controller">
	<img src={favicon} alt="" width="34" height="36" />
	<span>
		<strong>MikroTik</strong>
		Network Controller
	</span>
</a>

<style>
	.brand-mark {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: 44px;
		color: var(--color-brand);
		font-size: 12px;
		font-weight: 800;
		line-height: 1.1;
		text-transform: uppercase;
	}

	img {
		flex: 0 0 auto;
		width: 34px;
		height: auto;
	}

	span {
		display: grid;
		gap: 2px;
	}

	strong {
		font-size: 19px;
		font-weight: 800;
		text-transform: none;
	}
</style>
