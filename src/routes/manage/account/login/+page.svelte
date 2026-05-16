<script lang="ts">
  import { Alert, Button, Form, Input } from "$lib/client/components/primitives";

  let { form } = $props();
</script>

<main class="auth-page">
  <section class="auth-panel clean" aria-labelledby="signin-title">
    <div class="auth-copy">
      <h1 id="signin-title">Sign in</h1>
      <p>Access your local MikroTik Network Server.</p>
    </div>

    <Form ariaLabel="Sign in">
      {#if form?.message}
        <Alert variant="error">{form.message}</Alert>
      {/if}

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
        label="Password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
      />

      <Button type="submit" fullWidth>Sign in</Button>
    </Form>
  </section>
</main>

<style lang="scss">
  .auth-page {
    display: grid;
    min-height: 100vh;
    place-items: center;
    padding: 32px 16px;
    background: var(--color-page);

    .auth-panel {
      width: min(100%, 360px);
      padding: 28px;
      background: var(--color-surface);
    }

    .auth-copy {
      display: grid;
      gap: 10px;
    }
  }

  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.15;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.5;
  }

</style>
