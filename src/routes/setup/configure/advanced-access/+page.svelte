<script lang="ts">
  import Form from "$lib/client/components/primitives/Form.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import Alert from "$lib/client/components/primitives/Alert.svelte";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import Flexbox from "$lib/client/components/layout/Flexbox.svelte";
  import { goto } from "$app/navigation";

  let { data, form } = $props();

  const controllerName = $derived(
    form?.controllerName ?? data.setup.controllerName,
  );
  const country = $derived(form?.country ?? data.setup.country);
</script>

<section class="setup-panel" aria-labelledby="setup-title">
  <div class="setup-copy">
    <h1 id="setup-title">Create Your Admin Account</h1>
    <p>Set up your administrator credentials to secure the controller.</p>
  </div>

  <Form compact ariaLabel="Create administrator">
    {#if form?.message}
      <Alert variant="error">{form.message}</Alert>
    {/if}

    <Input name="controllerName" type="hidden" value={controllerName} />
    <Input name="country" type="hidden" value={country} />

    <Input
      compact
      label="Email"
      name="email"
      type="email"
      autocomplete="email"
      value={form?.email ?? ""}
      required
    />
    <Input
      compact
      label="Display name"
      name="displayName"
      autocomplete="name"
      value={form?.displayName ?? ""}
      required
    />
    <Input
      compact
      label="Password"
      name="password"
      type="password"
      autocomplete="new-password"
      minlength={12}
      required
    />
    <Input
      compact
      label="Confirm password"
      name="confirmPassword"
      type="password"
      autocomplete="new-password"
      minlength={12}
      required
    />

    <Flexbox class="setup-actions" justify="space-between">
      <Button variant="primary" type="submit" transparent onclick={() => goto(`/setup/configure/controller-name?controllerName=${encodeURIComponent(controllerName)}&country=${encodeURIComponent(country)}`)} size="sm">← Back</Button>

      <Button variant="primary" type="submit" size="sm">Finish setup</Button>
    </Flexbox>
  </Form>
</section>

<style lang="scss">
  .setup-panel {
    display: grid;
    gap: 28px;
    width: min(100%, 350px);
    margin: 0 auto;
  }

  .setup-copy {
    display: grid;
    gap: 10px;
  }

  .back-link {
    margin-top: 16px;
    color: var(--color-muted);
    font-size: 13px;
    text-decoration: none;

    &:hover {
      color: var(--color-brand);
    }
  }

  @media (min-width: 760px) {
    .setup-panel {
      align-self: center;
      margin: 0;
    }

    .setup-actions {
      position: fixed;
      right: 32px;
      bottom: 24px;
      left: calc(40vw + 64px);
      margin-top: 0;
    }
  }
</style>
