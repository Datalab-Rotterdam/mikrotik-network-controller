<script lang="ts">
  import { goto } from "$app/navigation";
  import Form from "$lib/client-lib/components/form/Form.svelte";
  import Input from "$lib/client-lib/components/form/Input.svelte";
  import Button from "$lib/client-lib/components/layout/Button.svelte";
  import Flexbox from "$lib/client-lib/components/layout/Flexbox.svelte";
  import Message from "$lib/client-lib/components/utils/Message.svelte";

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

  <Form class="setup-form" aria-label="Create administrator">
    {#if form?.message}
      <Message type="danger" message={form.message} />
    {/if}

    <input name="controllerName" type="hidden" value={controllerName} />
    <input name="country" type="hidden" value={country} />

    <Input
      type="email"
      label="Email"
      name="email"
      autocomplete="email"
      value={form?.email ?? ""}
      required
    />
    <Input
      type="text"
      label="Display name"
      name="displayName"
      autocomplete="name"
      value={form?.displayName ?? ""}
      required
    />
    <Input
      type="password"
      label="Password"
      name="password"
      autocomplete="new-password"
      minlength={12}
      required
    />
    <Input
      type="password"
      label="Confirm password"
      name="confirmPassword"
      autocomplete="new-password"
      minlength={12}
      required
    />

    <Flexbox class="setup-actions" justify="space-between">
      <Button
        variant="primary"
        transparent
        onclick={() =>
          goto(
            `/setup/configure/controller-name?controllerName=${encodeURIComponent(controllerName)}&country=${encodeURIComponent(country)}`,
          )}
        size="sm"
      >
        Back
      </Button>

      <Button variant="primary" type="submit" size="sm">Finish setup</Button>
    </Flexbox>
  </Form>
</section>

<style lang="scss">
  .setup-panel {
    display: grid;
    gap: 28px;
    width: min(100%, 350px);
    margin: 0;
    justify-self: start;
  }

  .setup-copy {
    display: grid;
    gap: 10px;
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
