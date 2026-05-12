<script lang="ts">
  let {
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    onPageChange,
    showPageNumbers = true,
    itemsPerPageLabel = "per page",
  }: {
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    showPageNumbers?: boolean;
    itemsPerPageLabel?: string;
  } = $props();

  function prev() {
    if (currentPage > 1) onPageChange(currentPage - 1);
  }

  function next() {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  }

  $effect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      onPageChange(totalPages);
    }
  });
</script>

{#if totalPages > 1}
  <nav class="pagination" aria-label="Pagination">
    <button
      class="page-btn page-btn--prev"
      disabled={currentPage === 1}
      onclick={prev}
      aria-label="Previous page"
    >
      <span class="bi bi-chevron-left" aria-hidden="true"></span>
    </button>

    {#if showPageNumbers}
      <div class="page-numbers">
        {#if totalPages <= 7}
          {#each Array(totalPages) as _, i}
            <button
              class="page-page"
              class:active={currentPage === i + 1}
              onclick={() => onPageChange(i + 1)}
              aria-label="Page {i + 1}"
              aria-current={currentPage === i + 1 ? "page" : undefined}
            >
              {i + 1}
            </button>
          {/each}
        {:else}
          {#if currentPage > 3}
            <button class="page-page" onclick={() => onPageChange(1)}>1</button>
            {#if currentPage > 4}
              <span class="page-ellipsis">…</span>
            {/if}
          {/if}

          {#each Array(Math.min(totalPages - currentPage + 3, 3)) as _, i}
            {#if currentPage + i > 1 && currentPage + i < totalPages}
              <button
                class="page-page"
                class:active={currentPage === currentPage + i}
                onclick={() => onPageChange(currentPage + i)}
                aria-label="Page {currentPage + i}"
                aria-current={currentPage === currentPage + i ? "page" : undefined}
              >
                {currentPage + i}
              </button>
            {/if}
          {/each}

          {#if currentPage < totalPages - 2}
            {#if currentPage < totalPages - 3}
              <span class="page-ellipsis">…</span>
            {/if}
            <button class="page-page" onclick={() => onPageChange(totalPages)}>{totalPages}</button>
          {/if}
        {/if}
      </div>
    {/if}

    <button
      class="page-btn page-btn--next"
      disabled={currentPage === totalPages}
      onclick={next}
      aria-label="Next page"
    >
      <span class="bi bi-chevron-right" aria-hidden="true"></span>
    </button>

    {#if totalItems > 0}
      <span class="page-info">
        Page {currentPage} of {totalPages}
      </span>
    {/if}
  </nav>
{/if}

<style lang="scss">
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px 0;

    .page-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid var(--color-line, #dedfde);
      border-radius: var(--radius-sm, 3px);
      background: var(--color-surface, #fff);
      color: var(--color-muted, #686c6b);
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: var(--color-page, #f3f4f4);
        color: var(--color-text, #171717);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .page-numbers {
      display: flex;
      align-items: center;
      gap: 2px;

      .page-page {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 6px;
        border: 1px solid var(--color-line, #dedfde);
        border-radius: var(--radius-sm, 3px);
        background: var(--color-surface, #fff);
        color: var(--color-muted, #686c6b);
        cursor: pointer;
        font-size: var(--font-size-small, 0.875rem);
        font-weight: var(--font-weight-medium, 500);
        transition: all 0.15s ease;

        &:hover {
          background: var(--color-page, #f3f4f4);
          color: var(--color-text, #171717);
        }

        &.active {
          background: var(--color-link, #0d6fd6);
          border-color: var(--color-link, #0d6fd6);
          color: var(--color-surface, #fff);
          font-weight: var(--font-weight-semibold, 650);
        }
      }

      .page-ellipsis {
        padding: 0 4px;
        color: var(--color-muted, #686c6b);
      }
    }

    .page-info {
      margin-left: 8px;
      font-size: var(--font-size-small, 0.875rem);
      color: var(--color-muted, #686c6b);
    }
  }
</style>
