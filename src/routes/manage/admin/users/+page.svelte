<script lang="ts">
  import { enhance } from "$app/forms";
  import { Page, PageHeader } from "$lib/client/components/layout";
  import { Alert, Button, Card, Checkbox, Input, StatusPill } from "$lib/client/components/primitives";

  let { data, form } = $props();

  type UserRow = (typeof data.users)[number];

  let showInvite = $state(false);
  let selectedUser = $state<UserRow | null>(null);
  let resetTarget = $state<UserRow | null>(null);

  function formatDate(d: Date | string | null | undefined) {
    if (!d) return "—";
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
</script>

<Page>
  <PageHeader title="Users">
    {#snippet actions()}
      <Button
        variant="secondary"
        size="sm"
        onclick={() => (showInvite = !showInvite)}
      >
        {showInvite ? "Cancel" : "+ Invite user"}
      </Button>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <Alert variant="error">{form.error}</Alert>
  {/if}
  {#if form?.success && form?.message}
    <Alert variant="success">{form.message}</Alert>
  {/if}

  {#if showInvite}
    <Card title="Invite user">
      <form
        method="POST"
        action="?/invite"
        use:enhance={() =>
          async ({ update }: any) => {
            await update();
            showInvite = false;
          }}
      >
        <div class="form-row">
          <Input
            name="email"
            label="Email"
            type="email"
            required
            placeholder="user@example.com"
          />
          <Input
            name="displayName"
            label="Display name"
            required
            placeholder="Jane Smith"
          />
          <Input
            name="password"
            label="Temporary password"
            type="password"
            required
            minlength={8}
            placeholder="Min 8 chars"
          />
        </div>
        <div class="role-picker">
          <span>Roles</span>
          <div class="role-checks">
            {#each data.roles as role}
              <Checkbox name="roleIds" label={role.name} value={role.id} />
            {/each}
          </div>
        </div>
        <div class="form-actions">
          <Button type="submit">Send invite</Button>
        </div>
      </form>
    </Card>
  {/if}

  <div class="table-wrapper">
    <table class="user-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Roles</th>
          <th>Last login</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as user}
          <tr class:disabled-row={user.disabledAt}>
            <td><strong>{user.displayName}</strong></td>
            <td>{user.email}</td>
            <td>
              <div class="role-tags">
                {#each user.roleNames as r}
                  <span class="role-tag">{r}</span>
                {:else}
                  <span class="no-role">—</span>
                {/each}
              </div>
            </td>
            <td>{formatDate(user.lastLoginAt)}</td>
            <td>
              <StatusPill status={user.disabledAt ? 'disabled' : 'active'} label={user.disabledAt ? 'Disabled' : 'Active'} size="sm" />
            </td>
            <td class="actions-cell">
              <Button
                variant="ghost"
                size="sm"
                onclick={() =>
                  (selectedUser = selectedUser?.id === user.id ? null : user)}
                >Manage</Button
              >
            </td>
          </tr>
          {#if selectedUser?.id === user.id}
            <tr class="manage-row">
              <td colspan="6">
                <div class="manage-panel">
                  <form
                    method="POST"
                    action="?/setRoles"
                    use:enhance
                    class="manage-section"
                  >
                    <input type="hidden" name="userId" value={user.id} />
                    <strong>Roles</strong>
                    <div class="role-checks">
                      {#each data.roles as role}
                        <Checkbox
                          name="roleIds"
                          label={role.name}
                          value={role.id}
                          checked={user.roleNames.includes(role.name)}
                        />
                      {/each}
                    </div>
                    <Button type="submit" size="sm">Save roles</Button>
                  </form>

                  <div class="manage-section">
                    <strong>Password</strong>
                    {#if resetTarget?.id === user.id}
                      <form
                        method="POST"
                        action="?/resetPassword"
                        use:enhance
                        class="inline-form"
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <Input
                          name="password"
                          type="password"
                          minlength={8}
                          placeholder="New password"
                          required
                        />
                        <div class="inline-actions">
                          <Button type="submit" size="sm">Set password</Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onclick={() => (resetTarget = null)}>Cancel</Button
                          >
                        </div>
                      </form>
                    {:else}
                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => (resetTarget = user)}
                        >Reset password</Button
                      >
                    {/if}
                  </div>

                  <div class="manage-section">
                    <strong>Access</strong>
                    {#if user.disabledAt}
                      <form method="POST" action="?/enable" use:enhance>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" size="sm">Enable account</Button>
                      </form>
                    {:else}
                      <form method="POST" action="?/disable" use:enhance>
                        <input type="hidden" name="userId" value={user.id} />
                        <Button type="submit" variant="danger" size="sm"
                          >Disable account</Button
                        >
                      </form>
                    {/if}
                  </div>

                  <div class="manage-section">
                    <strong>Remove</strong>
                    <form method="POST" action="?/remove" use:enhance>
                      <input type="hidden" name="userId" value={user.id} />
                      <Button
                        type="submit"
                        variant="danger"
                        size="sm"
                        onclick={(e: Event) => {
                          if (!confirm(`Delete ${user.displayName}?`))
                            e.preventDefault();
                        }}>Delete user</Button
                      >
                    </form>
                  </div>
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</Page>

<style lang="scss">
  .form-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .role-picker {
    display: grid;
    gap: 8px;

    > span {
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 700;
    }
  }

  .role-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .inline-form {
    display: grid;
    gap: 6px;
  }

  .inline-actions {
    display: flex;
    gap: 6px;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .user-table {
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

  .disabled-row td {
    opacity: 0.5;
  }

  .role-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .role-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    border-radius: 999px;
    padding: 0 8px;
    color: var(--color-brand);
    background: color-mix(in srgb, var(--color-brand) 10%, transparent);
    font-size: 11px;
    font-weight: 700;
  }

  .no-role {
    color: var(--color-muted);
  }

  .actions-cell {
    text-align: right;
  }

  .manage-row td {
    padding: 0;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-page);
  }

  .manage-panel {
    display: flex;
    gap: 24px;
    padding: 14px 16px;
    flex-wrap: wrap;
  }

  .manage-section {
    display: grid;
    gap: 8px;
    min-width: 160px;

    strong {
      color: var(--color-muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    form {
      display: grid;
      gap: 6px;
    }
  }
</style>
