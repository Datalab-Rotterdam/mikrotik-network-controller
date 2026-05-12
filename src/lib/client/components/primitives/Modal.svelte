<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    title,
    description,
    align = "center",
    width = "auto",
    onClose,
    content
  }: {
    open?: boolean;
    title: string;
    description?: string;
    align?: "center" | "top";
    width?: "sm" | "md" | "lg" | "xl" | "auto";
    onClose?: () => void;
    content?: Snippet;
  } = $props();

  let modalEl = $state<HTMLDivElement>();

  onMount(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        open = false;
        onClose?.();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  });

  function handleBackdropClick(e: MouseEvent) {
    if (!modalEl || !modalEl.contains(e.target as Node)) {
      open = false;
      onClose?.();
    }
  }

  function close() {
    open = false;
    onClose?.();
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation"></div>
  <div class="modal-root modal--{align}" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1" onclick={(e) => e.stopPropagation()}>
    <div class="modal modal--{width}" bind:this={modalEl}>
      <div class="modal-header">
        <div class="modal-title-block">
          <h2 id="modal-title" class="modal-title">{title}</h2>
          {#if description}
            <p class="modal-description">{description}</p>
          {/if}
        </div>
        <button type="button" class="modal-close" aria-label="Close" onclick={close}>
          <span class="bi bi-x-lg"></span>
        </button>
      </div>
      <div class="modal-body">
        {#if content}
          {@render content()}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.4);
    animation: fade-in 0.15s ease;
  }

  .modal-root {
    position: fixed;
    inset: 0;
    z-index: 41;
    display: flex;
    justify-content: center;

    &.modal--top {
      align-items: flex-start;
      padding-top: 10vh;
    }

    &.modal--center {
      align-items: center;
    }
  }

  .modal {
    width: 100%;
    max-height: calc(100vh - 48px);
    background: var(--color-surface, #fff);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    animation: slide-up 0.2s ease-out;
    overflow: hidden;

    &.modal--sm { max-width: 340px; }
    &.modal--md { max-width: 480px; }
    &.modal--lg { max-width: 640px; }
    &.modal--xl { max-width: 900px; }

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid var(--color-line, #dedfde);

      .modal-title-block {
        flex: 1;
        min-width: 0;
      }

      .modal-title {
        margin: 0;
        font-size: var(--font-size-h3, 1.25rem);
        font-weight: var(--font-weight-semibold, 650);
        color: var(--color-text, #171717);
      }

      .modal-description {
        margin: 4px 0 0;
        font-size: var(--font-size-small, 0.875rem);
        color: var(--color-muted, #686c6b);
      }

      .modal-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 4px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--color-muted, #686c6b);
        font-size: 18px;
        opacity: 0.6;
        flex-shrink: 0;

        &:hover { opacity: 1; }
      }
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
