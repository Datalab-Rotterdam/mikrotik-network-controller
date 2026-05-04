<script lang="ts" generics="T extends string">
	import type { Snippet } from 'svelte';

	type TabItem<T extends string = string> = {
		id: T;
		label: string;
		icon?: string;
	};

	let {
		tabs,
		activeTab,
		getHref,
		children,
		ariaLabel = 'Tabs'
	}: {
		tabs: TabItem<T>[];
		activeTab: T;
		getHref: (tabId: T) => string;
		children: Snippet;
		ariaLabel?: string;
	} = $props();
</script>

<div class="tab-layout">
	<nav class="tab-list" aria-label={ariaLabel}>
		{#each tabs as tab}
			<a
				class:active={tab.id === activeTab}
				href={getHref(tab.id)}
				aria-current={tab.id === activeTab ? 'page' : undefined}
			>
				{#if tab.icon}
					<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
						<path fill="currentColor" d={tab.icon} />
					</svg>
				{/if}
				<span>{tab.label}</span>
			</a>
		{/each}
	</nav>
	<div class="tab-panel">
		{@render children()}
	</div>
</div>

<style lang="scss">
	.tab-layout {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	.tab-list {
		display: inline-flex;
		justify-self: start;
		max-width: 100%;
		min-height: 36px;
		border: 1px solid #edf0f2;
		border-radius: 5px;
		overflow-x: auto;
		background: var(--color-surface);
	}

	.tab-list a {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		flex: 0 0 auto;
		min-width: 0;
		padding: 0 13px;
		border-right: 1px solid #edf0f2;
		color: #6f7780;
		font-size: 13px;
		font-weight: 750;
		text-decoration: none;
		white-space: nowrap;
	}

	.tab-list a:last-child {
		border-right: 0;
	}

	.tab-list a:hover {
		color: #30373d;
		background: #fbfdff;
	}

	.tab-list a:focus-visible {
		outline: 2px solid rgba(13, 111, 214, 0.28);
		outline-offset: -2px;
	}

	.tab-list a.active {
		color: var(--color-link);
		background: #fbfdff;
	}

	.tab-list svg {
		flex: 0 0 auto;
	}

	.tab-panel {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	@media (max-width: 760px) {
		.tab-list {
			width: 100%;
		}

		.tab-list a {
			flex: 1 0 auto;
		}
	}
</style>
