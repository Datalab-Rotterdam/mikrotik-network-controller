<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    sidebar,
    children,
    sidebarWidth = 220,
  }: {
    sidebar: Snippet;
    children: Snippet;
    sidebarWidth?: number;
  } = $props();
</script>

<!--
  Full-height two-pane manager layout.
  Escapes the page content padding via negative margins using CSS vars
  set by the parent layout's .content block.
  Sidebar is sticky; main area scrolls independently.
-->
<div class="manager-layout" style="--sidebar-w: {sidebarWidth}px">
  <aside class="manager-sidebar">
    {@render sidebar()}
  </aside>
  <div class="manager-main">
    {@render children()}
  </div>
</div>

<style>
  .manager-layout {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    /* Escape layout .content padding */
    margin: calc(-1 * var(--page-pad-y, 18px)) calc(-1 * var(--page-pad-x, 14px));
    min-height: calc(100% + 2 * var(--page-pad-y, 18px));
    width: calc(100% + 2 * var(--page-pad-x, 14px));
  }

  .manager-sidebar {
    border-right: 1px solid var(--color-border, var(--color-line));
    background: var(--color-surface);
    /* Sticky within the scrolling content area */
    position: sticky;
    top: calc(-1 * var(--page-pad-y, 18px));
    height: calc(100vh - 48px); /* 48px = topbar height */
    overflow-y: auto;
  }

  .manager-main {
    min-width: 0;
    padding: var(--page-pad-y, 18px) 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
</style>
