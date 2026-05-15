<script lang="ts">
  import { onMount } from "svelte";
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  let {
    text,
    position = "top",
    delay = 200,
    children,
    ...rest
  }: {
    text: string;
    position?: "top" | "bottom" | "left" | "right";
    delay?: number;
    children: Snippet;
  } & HTMLAttributes<HTMLSpanElement> = $props();

  let showing = $state(false);
  let triggerEl: HTMLSpanElement;
  let timer: ReturnType<typeof setTimeout> | null = null;

  let x = $state(0);
  let y = $state(0);

  function computeCoords() {
    const rect = triggerEl.getBoundingClientRect();
    if (position === "top") {
      x = rect.left + rect.width / 2;
      y = rect.top - 6;
    } else if (position === "bottom") {
      x = rect.left + rect.width / 2;
      y = rect.bottom + 6;
    } else if (position === "left") {
      x = rect.left - 6;
      y = rect.top + rect.height / 2;
    } else {
      x = rect.right + 6;
      y = rect.top + rect.height / 2;
    }
  }

  function show() {
    clearTimeout(timer ?? undefined);
    timer = setTimeout(() => {
      computeCoords();
      showing = true;
    }, delay);
  }

  function hide() {
    clearTimeout(timer ?? undefined);
    timer = setTimeout(() => { showing = false; }, 100);
  }

  onMount(() => () => { timer && clearTimeout(timer); });
</script>

<span class="tooltip-trigger" bind:this={triggerEl} onmouseenter={show} onmouseleave={hide} {...rest}>
  {#if children}
    {@render children()}
  {/if}
</span>

<!-- Always in DOM — opacity-based hide avoids insertion triggering mouseenter -->
<span
  class="tooltip-bubble tooltip--{position}"
  class:visible={showing}
  role="tooltip"
  aria-hidden={!showing}
  style="--tx: {x}px; --ty: {y}px;"
>
  {text}
</span>

<style lang="scss">
  .tooltip-trigger {
    display: inline-flex;
  }

  .tooltip-bubble {
    position: fixed;
    z-index: 9999;
    padding: 4px 8px;
    border-radius: var(--radius-sm, 3px);
    background: var(--color-brand, #0e0e10);
    color: var(--color-surface, #fff);
    font-size: 11px;
    font-weight: var(--font-weight-medium, 500);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s ease;

    &.visible {
      opacity: 1;
    }

    &::after {
      content: "";
      position: absolute;
      border: 4px solid transparent;
    }

    &.tooltip--top {
      left: var(--tx);
      top: var(--ty);
      transform: translate(-50%, -100%);

      &::after {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-top-color: var(--color-brand, #0e0e10);
      }
    }

    &.tooltip--bottom {
      left: var(--tx);
      top: var(--ty);
      transform: translateX(-50%);

      &::after {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-bottom-color: var(--color-brand, #0e0e10);
      }
    }

    &.tooltip--left {
      left: var(--tx);
      top: var(--ty);
      transform: translate(-100%, -50%);

      &::after {
        top: 50%;
        left: 100%;
        transform: translateY(-50%);
        border-left-color: var(--color-brand, #0e0e10);
      }
    }

    &.tooltip--right {
      left: var(--tx);
      top: var(--ty);
      transform: translateY(-50%);

      &::after {
        top: 50%;
        right: 100%;
        transform: translateY(-50%);
        border-right-color: var(--color-brand, #0e0e10);
      }
    }
  }
</style>
