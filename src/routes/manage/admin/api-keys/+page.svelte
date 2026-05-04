<script lang="ts">
  import { enhance } from "$app/forms";
  import Alert from "$lib/client/components/primitives/Alert.svelte";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import Card from "$lib/client/components/primitives/Card.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import PageHeader from "$lib/client/components/primitives/PageHeader.svelte";
  import Select from "$lib/client/components/primitives/Select.svelte";

  let { data, form } = $props();

  let showCreate = $state(false);
  let copied = $state(false);

  function formatDate(d: Date | string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function isExpired(d: Date | string | null | undefined) {
    if (!d) return false;
    return new Date(d) < new Date();
  }

  async function copyKey(raw: string) {
    await navigator.clipboard.writeText(raw);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }
</script>

<div class="keys-page">
  <PageHeader title="API Keys">
    {#snippet actions()}
      <Button
        variant="secondary"
        size="sm"
        onclick={() => (showCreate = !showCreate)}
        >{showCreate ? "Cancel" : "+ New key"}</Button
      >
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <Alert variant="error">{form.error}</Alert>
  {/if}

  {#if form?.success && form?.createdRaw}
    <div class="alert-bar key-reveal">
      <div class="reveal-header">
        <strong>Key created: {form.createdName}</strong>
        <span class="reveal-note">Copy now — shown once only.</span>
      </div>
      <div class="key-row">
        <code class="key-token">{form.createdRaw}</code>
        <Button
          variant="ghost"
          size="sm"
          onclick={() => copyKey(form.createdRaw!)}
        >
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
    </div>
  {/if}

  {#if showCreate}
    <Card title="New API key">
      <form
        method="POST"
        action="?/create"
        use:enhance={() =>
          async ({ update }: any) => {
            await update();
            showCreate = false;
          }}
      >
        <div class="form-row">
          <Input
            name="name"
            label="Key name"
            required
            placeholder="e.g. automation-script"
          />
          <Select
            name="userId"
            label="Owner"
            options={data.users.map((u) => ({
              value: u.id,
              label: `${u.displayName} (${u.email})`,
            }))}
          />
          <Input name="expiresAt" label="Expires (optional)" type="date" />
        </div>
        <div class="form-actions">
          <Button type="submit">Generate key</Button>
        </div>
      </form>
    </Card>
  {/if}

  <div class="table-wrapper">
    <table class="key-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Owner</th>
          <th>Last used</th>
          <th>Expires</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each data.keys as key}
          <tr class:expired-row={isExpired(key.expiresAt)}>
            <td><strong>{key.name}</strong></td>
            <td class="owner-cell">
              {#if key.userDisplay}
                <span>{key.userDisplay}</span>
                <span class="email-sub">{key.userEmail}</span>
              {:else}
                <span class="muted">—</span>
              {/if}
            </td>
            <td>{formatDate(key.lastUsedAt)}</td>
            <td>
              {#if key.expiresAt}
                <span
                  class:expired-pill={isExpired(key.expiresAt)}
                  class:expiry-pill={!isExpired(key.expiresAt)}
                >
                  {formatDate(key.expiresAt)}
                </span>
              {:else}
                <span class="muted">Never</span>
              {/if}
            </td>
            <td>{formatDate(key.createdAt)}</td>
            <td class="actions-cell">
              <form method="POST" action="?/revoke" use:enhance>
                <input type="hidden" name="id" value={key.id} />
                <Button
                  variant="danger"
                  size="sm"
                  onclick={(e: Event) => {
                    if (!confirm(`Revoke key "${key.name}"?`))
                      e.preventDefault();
                  }}>Revoke</Button
                >
              </form>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="empty-row">No API keys yet.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style lang="scss">
  .keys-page {
    display: grid;
    gap: 16px;
  }

  .alert-bar.key-reveal {
    display: grid;
    gap: 8px;
    border: 1px solid var(--color-brand);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    background: color-mix(in srgb, var(--color-brand) 6%, transparent);
  }

  .reveal-header {
    display: flex;
    align-items: center;
    gap: 12px;

    strong {
      color: var(--color-text);
    }
  }

  .reveal-note {
    color: var(--color-muted);
    font-size: 12px;
  }

  .key-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .key-token {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
    font-family: ui-monospace, monospace;
    overflow-x: auto;
    white-space: nowrap;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  }

  .form-actions {
    display: flex;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .key-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th,
    td {
      height: 44px;
      border-bottom: 1px solid var(--color-border);
      padding: 0 12px;
      color: var(--color-text);
      text-align: left;
    }

    th {
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 700;
    }

    tr:last-child td {
      border-bottom: 0;
    }
  }

  .expired-row td {
    opacity: 0.5;
  }

  .owner-cell {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
  }

  .email-sub {
    color: var(--color-muted);
    font-size: 11px;
  }

  .muted {
    color: var(--color-muted);
  }

  .expiry-pill {
    display: inline-flex;
    align-items: center;
    height: 20px;
    border-radius: 999px;
    padding: 0 8px;
    color: var(--color-muted);
    background: color-mix(in srgb, var(--color-muted) 10%, transparent);
    font-size: 11px;
  }

  .expired-pill {
    display: inline-flex;
    align-items: center;
    height: 20px;
    border-radius: 999px;
    padding: 0 8px;
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    font-size: 11px;
    font-weight: 700;
  }

  .actions-cell {
    text-align: right;
  }

  .empty-row {
    color: var(--color-muted);
    text-align: center;
    height: 60px;
  }
</style>
