<script lang="ts" module>
  import type { HTMLAttributes } from "svelte/elements";
  import type { WebFigIconName } from "$lib/client/icons/webfig/webfig-icons";

  export type Props = {
    name: WebFigIconName;
    size?: number | string;
    title?: string;
    primary?: string;
    accent?: string;
  } & Omit<HTMLAttributes<HTMLSpanElement>, "children">;
</script>

<script lang="ts">
  import { webfigIcons } from "$lib/client/icons/webfig/webfig-icons";

  let {
    name,
    size = "1em",
    title,
    primary,
    accent,
    class: className,
    style = "",
    ...rest
  }: Props = $props();

  const iconSize = $derived(typeof size === "number" ? `${size}px` : size);
  const iconSvg = $derived(webfigIcons[name]);
  const computedStyle = $derived(
    [
      `--webfig-icon-size: ${iconSize}`,
      primary ? `--webfig-icon-primary: ${primary}` : "",
      accent ? `--webfig-icon-accent: ${accent}` : "",
      style,
    ]
      .filter(Boolean)
      .join("; "),
  );
</script>

<span
  class={["webfig-icon", className].filter(Boolean).join(" ")}
  style={computedStyle}
  role={title ? "img" : undefined}
  aria-label={title}
  aria-hidden={title ? undefined : "true"}
  {...rest}
>
  {@html iconSvg}
</span>

<style lang="scss">
  .webfig-icon {
    display: inline-flex;
    width: var(--webfig-icon-size);
    height: var(--webfig-icon-size);
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    color: var(--webfig-icon-primary, var(--icon-color));
    line-height: 1;
    vertical-align: -0.125em;
  }

  .webfig-icon :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
