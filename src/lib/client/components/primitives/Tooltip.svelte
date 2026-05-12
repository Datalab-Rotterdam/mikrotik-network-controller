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
  let tooltipEl: HTMLSpanElement;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function show() {
    clearTimeout(timer ?? undefined);
    timer = setTimeout(() => {
      showing = true;
    }, delay);
  }

  function hide() {
    timer = setTimeout(() => {
      showing = false;
    }, 100);
  }

  onMount(() => {
    return () => {
      timer && clearTimeout(timer);
    };
  });
</script>

<span class="tooltip" class:showing onmouseenter={show} onmouseleave={hide} {...rest}>
  {#if children}
    {@render children()}
  {/if}
  <span class="tooltip-text tooltip--{position}" role="tooltip" bind:this={tooltipEl}>
    {text}
  </span>
</span>

<style lang="scss">
  .tooltip {
    position: relative;
    display: inline-flex;

    .tooltip-text {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      padding: 4px 8px;
      border-radius: var(--radius-sm, 3px);
      background: var(--color-brand, #0e0e10);
      color: var(--color-surface, #fff);
      font-size: 11px;
      font-weight: var(--font-weight-medium, 500);
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.12s ease;

      &::after {
        content: "";
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
      }

      &.tooltip--top {
        bottom: calc(100% + 6px);

        &::after {
          top: 100%;
          border-top-color: var(--color-brand, #0e0e10);
        }
      }

      &.tooltip--bottom {
        top: calc(100% + 6px);

        &::after {
          bottom: 100%;
          border-bottom-color: var(--color-brand, #0e0e10);
        }
      }

      &.tooltip--left {
        top: 50%;
        right: calc(100% + 6px);
        left: auto;
        transform: translateY(-50%);

        &::after {
          top: 50%;
          left: 100%;
          transform: translateY(-50%);
          border-left-color: var(--color-brand, #0e0e10);
        }
      }

      &.tooltip--right {
        top: 50%;
        left: calc(100% + 6px);
        transform: translateY(-50%);

        &::after {
          top: 50%;
          right: 100%;
          transform: translateY(-50%);
          border-right-color: var(--color-brand, #0e0e10);
        }
      }
    }

    &.showing .tooltip-text {
      opacity: 1;
    }
  }
</style>
