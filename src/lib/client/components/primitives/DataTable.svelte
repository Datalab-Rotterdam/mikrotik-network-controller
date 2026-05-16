<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLTableAttributes } from "svelte/elements";
  import TableSkeleton from "./TableSkeleton.svelte";

  type Column<T = Record<string, unknown>> = {
    key: string;
    label: string;
    sortable?: boolean;
    width?: string;
    className?: string;
    sort?: (a: T, b: T) => number;
  };

  let {
    columns,
    data,
    loading = false,
    emptyMessage = "No data",
    onSort,
    cell,
    header,
    footer,
    skeletonRows = 5,
    children,
    ...rest
  }: {
    columns: Column[];
    data: Record<string, unknown>[];
    loading?: boolean;
    emptyMessage?: string;
    onSort?: (key: string, dir: "asc" | "desc") => void;
    cell?: Snippet<[{ row: Record<string, unknown>; column: Column }]>;
    header?: Snippet;
    footer?: Snippet;
    skeletonRows?: number;
    children?: Snippet<[{ row: Record<string, unknown> }]>;
  } & HTMLTableAttributes = $props();
</script>

{#if loading}
  <TableSkeleton columns={columns.length} rows={skeletonRows} />
{:else}
  <div class="table-wrapper">
    <table class="table-base" {...rest}>
      <colgroup>
        {#each columns as col}
          <col class={col.className?.split(" ")[0]} style={col.width ? `width: ${col.width}` : ""} />
        {/each}
      </colgroup>
      <thead>
        <tr>
          {#if header}
            {@render header()}
          {:else}
            {#each columns as col}
              <th
                class:sortable={col.sortable}
                class={col.className || ""}
                style={col.width ? `width: ${col.width}` : ""}
                onclick={() => col.sortable && onSort?.(col.key, "asc")}
              >
                <span class="th-content">
                  {col.label}
                  {#if col.sortable}
                    <span class="sort-icon" aria-hidden="true">↕</span>
                  {/if}
                </span>
              </th>
            {/each}
          {/if}
        </tr>
      </thead>
      <tbody>
        {#if data.length === 0}
          <tr>
            <td colspan={columns.length} class="empty-row">
              {emptyMessage}
            </td>
          </tr>
        {:else}
          {#each data as row}
            <tr>
              {#if cell}
                {#each columns as col}
                  <td class={col.className || ""}>
                    {@render cell({ row, column: col })}
                  </td>
                {/each}
              {:else if children}
                {@render children({ row })}
              {:else}
                {#each columns as col}
                  <td class={col.className || ""}>
                    {row[col.key] !== undefined ? String(row[col.key]) : ""}
                  </td>
                {/each}
              {/if}
            </tr>
          {/each}
        {/if}
      </tbody>
      {#if footer}
        <tfoot>
          <tr>
            <td colspan={columns.length}>
              {@render footer()}
            </td>
          </tr>
        </tfoot>
      {/if}
    </table>
  </div>
{/if}

<style lang="scss">
  .table-wrapper {
    overflow-x: auto;
  }

  .table-base {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--color-line, #dedfde);
    }

    th {
      font-weight: var(--font-weight-semibold, 650);
      color: var(--color-muted, #686c6b);
      font-size: var(--font-size-small, 0.875rem);

      &.sortable {
        cursor: pointer;
        user-select: none;

        &:hover {
          color: var(--color-text, #171717);
        }

        .sort-icon {
          margin-left: 4px;
          opacity: 0.4;
        }
      }
    }

    td {
      font-size: var(--font-size-body, 1rem);
      color: var(--color-text, #171717);
    }

    .empty-row {
      text-align: center;
      color: var(--color-muted, #686c6b);
      font-style: italic;
      padding: 24px;
    }
  }
</style>
