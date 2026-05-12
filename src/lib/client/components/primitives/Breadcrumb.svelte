<script lang="ts">
  let {
    items,
    separator = "/",
  }: {
    items: { label: string; href?: string }[];
    separator?: string;
  } = $props();
</script>

<nav class="breadcrumb" aria-label="Breadcrumb">
  {#each items as item, i}
    {#if item.href}
      <a href={item.href} class="breadcrumb-item" aria-current={i === items.length - 1 ? "page" : undefined}>
        {item.label}
      </a>
    {:else}
      <span class="breadcrumb-item breadcrumb-current">{item.label}</span>
    {/if}
    {#if i < items.length - 1}
      <span class="breadcrumb-sep" aria-hidden="true">{separator}</span>
    {/if}
  {/each}
</nav>

<style lang="scss">
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    font-size: var(--font-size-small, 0.875rem);
    flex-wrap: wrap;

    .breadcrumb-item {
      color: var(--color-muted, #686c6b);
      text-decoration: none;

      &:hover {
        color: var(--color-text, #171717);
      }

      &[aria-current="page"] {
        color: var(--color-text, #171717);
        font-weight: var(--font-weight-semibold, 650);
      }
    }

    .breadcrumb-current {
      color: var(--color-text, #171717);
      font-weight: var(--font-weight-semibold, 650);
    }

    .breadcrumb-sep {
      color: var(--color-brand-light, #c8c8c7);
      user-select: none;
    }
  }
</style>
