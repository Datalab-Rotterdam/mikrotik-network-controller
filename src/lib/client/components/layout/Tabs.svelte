<script lang="ts">
	import type { Snippet } from "svelte";

	let {
		tabs,
		activeTab,
		onTabChange,
		variant = "default",
		ariaLabel = "Tabs",
	}: {
		tabs: { id: string; label: string; icon?: string; count?: number }[];
		activeTab: string;
		onTabChange: (id: string) => void;
		variant?: "default" | "pills";
		ariaLabel?: string;
	} = $props();
</script>

<nav class="tabs tabs--{variant}" role="tablist" aria-label={ariaLabel}>
	{#each tabs as tab}
		<button
			role="tab"
			class:active={tab.id === activeTab}
			aria-selected={tab.id === activeTab}
			aria-controls={`panel-${tab.id}`}
			type="button"
			onclick={() => onTabChange(tab.id)}
		>
			{#if tab.icon}
				<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
					<path fill="currentColor" d={tab.icon} />
				</svg>
			{/if}
			<span>{tab.label}</span>
			{#if tab.count != null}
				<span class="tab-badge">{tab.count}</span>
			{/if}
		</button>
	{/each}
</nav>

<style lang="scss">
	.tabs {
		display: inline-flex;
		justify-self: start;
		max-width: 100%;
		min-height: 36px;
		overflow-x: auto;
		background: var(--color-surface, #fff);

		button {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 7px;
			flex: 0 0 auto;
			min-width: 0;
			padding: 0 13px;
			border: none;
			background: transparent;
			color: var(--color-muted, #686c6b);
			font-size: 13px;
			font-weight: var(--font-weight-medium, 500);
			cursor: pointer;
			white-space: nowrap;
			transition:
				color 0.15s ease,
				background-color 0.15s ease;

			&:hover {
				color: var(--color-text, #171717);
				background: rgba(0, 0, 0, 0.03);
			}

			&.active {
				color: var(--color-link, #0d6fd6);
				font-weight: var(--font-weight-bold, 750);
			}

			.tab-badge {
				padding: 1px 6px;
				border-radius: 999px;
				font-size: 10px;
				font-weight: var(--font-weight-bold, 750);
				background: var(--color-line, #dedfde);
				color: var(--color-muted, #686c6b);
			}

			&.active .tab-badge {
				background: rgba(13, 111, 214, 0.12);
				color: var(--color-link, #0d6fd6);
			}
		}

		// default variant — underline style
		&.tabs--default button {
			border-bottom: 2px solid transparent;

			&.active {
				border-bottom-color: var(--color-link, #0d6fd6);
			}
		}

		// pills variant — rounded pill style
		&.tabs--pills {
			border: 1px solid var(--color-line, #dedfde);
			border-radius: var(--radius-md, 6px);

			button {
				border-right: 1px solid var(--color-line, #dedfde);

				&:last-child {
					border-right: none;
				}

				&:hover {
					background: rgba(0, 0, 0, 0.02);
				}

				&.active {
					background: rgba(13, 111, 214, 0.06);
				}

				.tab-badge {
					background: var(--color-page, #f3f4f4);
				}

				&.active .tab-badge {
					background: rgba(13, 111, 214, 0.12);
					color: var(--color-link, #0d6fd6);
				}
			}
		}
	}
</style>
