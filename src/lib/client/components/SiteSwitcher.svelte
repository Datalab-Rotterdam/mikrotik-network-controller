<script lang="ts">
	import Dropdown from './Dropdown.svelte';

	type Site = {
		id: string;
		name: string;
	};

	let {
		activeSite,
		sites,
		pathname
	}: {
		activeSite: Site;
		sites: Site[];
		pathname?: string;
	} = $props();

	const sectionPath = $derived(pathname?.replace(`/manage/${activeSite.id}`, '') || '');
	const hrefFor = (site: Site) => `/manage/${site.id}${sectionPath}`;
</script>

<Dropdown rootClass="site-switcher" panelClass="site-menu">
	{#snippet trigger()}
		<span>{activeSite.name}</span>
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path fill="currentColor" d="m7 10 5 5 5-5H7Z" />
		</svg>
	{/snippet}

	<div class="site-content">
		<div class="site-list" aria-label="Sites">
			{#each sites as site}
				<a class:active={site.id === activeSite.id} href={hrefFor(site)}>
					<span>{site.name}</span>
					{#if site.id === activeSite.id}
						<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
							<path fill="currentColor" d="m9 16.2-3.5-3.5L4 14.2l5 5L20 8.3 18.5 7 9 16.2Z" />
						</svg>
					{/if}
				</a>
			{/each}
		</div>

		<form class="add-site" method="POST" action="/manage/sites">
			<label>
				<span>Add site</span>
				<input name="name" placeholder="Site name" required />
			</label>
			<button type="submit" aria-label="Add site">
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					<path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
				</svg>
			</button>
		</form>
	</div>
</Dropdown>

<style lang="scss">
	:global(.site-switcher) {
		width: min(100%, 260px);
	}

	:global(.site-switcher summary) {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 34px;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 0 10px;
		color: var(--color-brand-muted);
		font-size: 18px;
		font-weight: 800;
		cursor: pointer;
		max-width: 100%;

		span {
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}

	:global(.site-switcher[open] summary),
	:global(.site-switcher summary:hover) {
		border-color: #dce4e9;
		background: #fbfdff;
	}

	:global(.site-menu) {
		width: 260px;
	}

	.site-list {
		display: grid;
		max-height: 220px;
		overflow-y: auto;
	}

	.site-list a {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		min-height: 38px;
		padding: 0 12px;
		color: #323a40;
		font-size: 13px;
		border-bottom: 1px solid #f0f2f4;

		&:hover,
		&.active {
			color: var(--color-link);
			background: #fbfdff;
		}
	}

	.add-site {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 34px;
		gap: 8px;
		padding: 10px;
		background: #fbfdff;
	}

	label {
		display: grid;
		gap: 4px;
		color: #7d8790;
		font-size: 11px;
		font-weight: 700;
	}

	input {
		width: 100%;
		height: 30px;
		border: 1px solid #dce4e9;
		border-radius: 4px;
		padding: 0 9px;
		color: var(--color-brand);
		background: var(--color-surface);
	}

	input:focus {
		border-color: var(--color-brand);
		outline: 3px solid rgba(14, 14, 16, 0.14);
	}

	button {
		align-self: end;
		display: grid;
		place-items: center;
		width: 34px;
		height: 30px;
		border: 1px solid var(--color-link);
		border-radius: 4px;
		color: var(--color-surface);
		background: var(--color-link);
		cursor: pointer;
	}

	@media (max-width: 520px) {
		:global(.site-switcher),
		:global(.site-menu) {
			width: min(100vw - 78px, 260px);
		}

		:global(.site-switcher summary) {
			font-size: 16px;
			padding: 0 8px;
		}
	}
</style>
