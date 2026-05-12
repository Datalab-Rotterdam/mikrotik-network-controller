<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Button from "./Button.svelte";

  let {
    open = $bindable(false),
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "danger",
    onConfirm,
    onCancel,
  }: {
    open?: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "danger" | "warning" | "primary";
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  } = $props();

  let confirming = $state(false);

  const dispatch = createEventDispatcher<{ confirm: void; cancel: void }>();

  function handleConfirm() {
    if (confirming) return;
    confirming = true;
    const result = onConfirm?.();
    if (result instanceof Promise) {
      result.finally(() => {
        confirming = false;
      });
    } else {
      confirming = false;
    }
    dispatch("confirm");
  }

  function handleCancel() {
    onCancel?.();
    dispatch("cancel");
  }

  function handleBackdropClick() {
    handleCancel();
  }

  function stopPropagation(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

{#if open}
  <div class="modal-backdrop" onclick={handleBackdropClick} role="presentation"></div>
  <div class="modal-root" role="dialog" aria-modal="true" aria-labelledby="confirm-title" onclick={stopPropagation}>
    <div class={`modal modal--${variant}`} onkeydown={(e) => e.key === "Escape" && handleCancel()}>
      <div class="modal-header">
        <h2 id="confirm-title" class="modal-title">{title}</h2>
        <button type="button" class="modal-close" aria-label="Close" onclick={handleCancel}>
          <span class="bi bi-x-lg"></span>
        </button>
      </div>
      <div class="modal-body">
        <p class="modal-message">{message}</p>
      </div>
      <div class="modal-footer">
        <Button variant="ghost" onclick={handleCancel}>{cancelText}</Button>
        <Button variant="primary" loading={confirming} onclick={handleConfirm}>{confirmText}</Button>
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
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal {
    width: 100%;
    max-width: 440px;
    background: var(--color-surface, #fff);
    border-radius: var(--radius-lg, 12px);
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
    animation: slide-up 0.2s ease-out;

    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 20px 20px 0;

      .modal-title {
        margin: 0;
        font-size: var(--font-size-h3, 1.25rem);
        font-weight: var(--font-weight-semibold, 650);
        color: var(--color-text, #171717);
        line-height: 1.3;
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

        &:hover {
          opacity: 1;
        }
      }
    }

    .modal-body {
      padding: 12px 20px;

      .modal-message {
        margin: 0;
        font-size: var(--font-size-body, 1rem);
        color: var(--color-muted, #686c6b);
        line-height: 1.5;
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 20px 20px;
    }

    &.modal--warning {
      border-top: 3px solid var(--color-warning, #f59e0b);
    }

    &.modal--danger {
      border-top: 3px solid var(--color-danger, #8a1f1f);
    }

    &.modal--info {
      border-top: 3px solid var(--color-info, #0d6fd6);
    }
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
