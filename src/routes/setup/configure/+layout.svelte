<script lang="ts">
  import type { Snippet } from "svelte";
  import { Grid } from "$lib/client/components/layout";
  import favicon from "$lib/assets/favicon.svg";

  let { children }: { children: Snippet } = $props();
</script>

<main class="setup-page">
  <a
    class="setup-logo"
    href="/setup/configure"
    aria-label="MikroTik Network Controller setup"
  >
    <img src={favicon} alt="" width="34" height="37" />
  </a>

  <Grid gap="0" class="setup-shell">
    <div class="setup-visual">
      <img
        class="setup-product-image"
        src="/images/ethernet_routers_600.webp"
        alt="MikroTik routers and switches"
      />
    </div>

    <div class="setup-workspace">
      {@render children()}
    </div>
  </Grid>
</main>

<style lang="scss">
  .setup-page {
    position: relative;
    min-height: 100vh;
    background: var(--color-surface);
  }

  .setup-logo {
    display: grid;
    place-items: center;
    position: relative;
    z-index: 2;
    width: 38px;
    height: 38px;
    margin: 16px;
  }

  .setup-logo img {
    width: 28px;
    height: auto;
  }

  .setup-shell {
    width: 100%;
  }

  .setup-visual {
    display: none;
  }

  .setup-workspace {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    min-width: 0;
    padding: 40px 24px;
  }

  @media (min-width: 760px) {
    .setup-logo {
      position: absolute;
      top: 18px;
      left: 18px;
      margin: 0;
    }

    :global(.setup-shell) {
      min-height: 100vh;
      grid-template-columns: 1fr 2fr;
      justify-items: start;
    }

    .setup-workspace {
      align-items: flex-start;
      justify-content: center;
      min-height: 100vh;
      min-width: 0;
      padding: 40px 24px;
    }

    .setup-visual {
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: linear-gradient(180deg, #ffffff 0%, #f8f9f9 100%);
      border-right: 1px solid #eef0f2;
    }

    .setup-product-image {
      max-width: 90%;
      max-height: 90%;
      width: auto;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 24px 28px rgba(14, 14, 16, 0.12));
    }

    .setup-workspace {
      padding: 80px clamp(48px, 5vw, 80px) 24px;
    }
  }
</style>
