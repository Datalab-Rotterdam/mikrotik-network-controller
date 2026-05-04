<script lang="ts">
  let {
    columns = 7,
    rows = 5,
  }: {
    columns?: number;
    rows?: number;
  } = $props();
</script>

<div class="table-skeleton" role="status" aria-label="Loading devices">
  <div class="skeleton-row skeleton-header">
    {#each Array(columns) as _, i}
      <div
        class="skeleton-cell"
        style="--flex: {i === 0 ? 10 : i === 1 ? 64 : 0}"
      >
        <span class="skeleton-block skeleton-header-block"></span>
      </div>
    {/each}
  </div>
  {#each Array(rows) as _, i}
    <div class="skeleton-row">
      {#each Array(columns) as _, j}
        <div
          class="skeleton-cell"
          style="--flex: {j === 0 ? 10 : j === 1 ? 64 : 0}"
        >
          <span
            class="skeleton-block"
            style="--delay: {((i * columns + j) % 7) * 0.08}s"
          ></span>
        </div>
      {/each}
    </div>
  {/each}
</div>

<style lang="scss">
  .table-skeleton {
    border-top: 1px solid var(--color-line, #dedfde);
    background: var(--color-surface, #fff);
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    height: 42px;
    padding: 0 14px;
    border-bottom: 1px solid var(--color-line, #dedfde);
    gap: 12px;
  }

  .skeleton-header {
    border-bottom-width: 0;
  }

  .skeleton-cell {
    --flex: 0;
    display: flex;
    align-items: center;
    min-width: 0;
    flex-shrink: 0;

    @media (--col-state) {
      width: 10px;
      flex: 0 0 10px;
    }

    @media (--col-type) {
      width: 64px;
      flex: 0 0 64px;
    }
  }

  .skeleton-block {
    height: 12px;
    border-radius: var(--radius-sm, 3px);
    background: var(--color-line, #dedfde);
    animation: pulse 1.5s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
    min-width: 20px;

    &.skeleton-header-block {
      width: 40%;
      height: 10px;
    }
  }

  .skeleton-cell:not(:nth-child(1)):not(:nth-child(2)) .skeleton-block {
    width: 70%;
  }

  .skeleton-cell:nth-child(1) .skeleton-block {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .skeleton-cell:nth-child(2) .skeleton-block {
    width: 24px;
    height: 24px;
    border-radius: var(--radius-sm, 3px);
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.35;
    }
  }
</style>
