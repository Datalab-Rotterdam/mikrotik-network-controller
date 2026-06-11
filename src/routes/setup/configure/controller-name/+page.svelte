<script lang="ts">
  import { page } from "$app/state";
  import Form from "$lib/client-lib/components/form/Form.svelte";
  import Input from "$lib/client-lib/components/form/Input.svelte";
  import Button from "$lib/client-lib/components/layout/Button.svelte";
  import Flexbox from "$lib/client-lib/components/layout/Flexbox.svelte";

  const countries = [
    { value: "Netherlands", label: "Netherlands" },
    { value: "Belgium", label: "Belgium" },
    { value: "Germany", label: "Germany" },
    { value: "United Kingdom", label: "United Kingdom" },
    { value: "United States", label: "United States" },
  ];

  const controllerName = $derived(page.url.searchParams.get("controllerName"));
  const selectedCountry = $derived(page.url.searchParams.get("country"));
</script>

<section class="setup-panel" aria-labelledby="setup-title">
  <div class="setup-copy">
    <h1 id="setup-title">Name Your Network Controller</h1>
    <p>Centrally manage all your MikroTik devices from one place.</p>
  </div>

  <Form
    class="setup-form"
    method="GET"
    action="./advanced-access"
    aria-label="Name controller"
  >
    <Input
      type="text"
      label="Controller name"
      name="controllerName"
      autocomplete="organization"
      value={controllerName ?? ""}
      required
      placeholder="e.g. Office, Branch-1"
    />

    <Input
      type="select"
      name="country"
      label="Country / region"
      options={countries}
      value={selectedCountry ?? ""}
      placeholder="Select country"
      required
    />

    <Input name="acceptedTerms" type="checkbox" required variant="checkbox">
      I agree to the <a
        href="https://www.mozilla.org/en-US/MPL/2.0/"
        target="_blank"
        rel="noreferrer">license</a
      >.
    </Input>

    <Flexbox class="setup-actions" justify="flex-end">
      <Button variant="primary" type="submit" size="sm">Next</Button>
	</Flexbox>

  </Form>
</section>

<style lang="scss">
  .setup-panel {
    display: grid;
    gap: 28px;
    width: min(100%, 350px);
    margin: 0;
  }

  .setup-copy {
    display: grid;
    gap: 10px;
  }

  a {
    color: var(--color-link);
    text-decoration: underline;
  }

  :global(.setup-actions) {
    margin-top: 24px;
  }

  :global(.setup-form) {
    display: grid;
    gap: 12px;
  }

  @media (min-width: 760px) {
    .setup-panel {
      align-self: center;
      margin: 0;
    }

    :global(.setup-actions) {
      position: fixed;
      right: 32px;
      bottom: 24px;
      left: calc(33.333vw + clamp(48px, 5vw, 80px));
      margin-top: 0;
    }
  }
</style>
