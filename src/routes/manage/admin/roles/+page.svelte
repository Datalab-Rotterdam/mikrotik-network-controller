<script lang="ts">
  import { enhance } from "$app/forms";
  import {PageHeader} from "$lib/client/components/layout";
  import Alert from "$lib/client/components/primitives/Alert.svelte";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import Card from "$lib/client/components/primitives/Card.svelte";
  import Checkbox from "$lib/client/components/primitives/Checkbox.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import ResponsiveGrid from "$lib/client/components/layout/ResponsiveGrid.svelte";

  let { data, form } = $props();
  type Role = (typeof data.roles)[number];

  let showCreate = $state(false);
  let editing = $state<Role | null>(null);
</script>

<div class="roles-page">
  <PageHeader title="Roles">
    {#snippet actions()}
      <Button
        variant="secondary"
        size="sm"
        onclick={() => {
          showCreate = !showCreate;
          editing = null;
        }}
      >
        {showCreate ? "Cancel" : "+ New role"}
      </Button>
    {/snippet}
  </PageHeader>

  {#if form?.error}
    <Alert variant="error">{form.error}</Alert>
  {/if}

  {#if showCreate}
    <Card title="New role">
      <form
        method="POST"
        action="?/create"
        use:enhance={() =>
          async ({ update }: any) => {
            await update();
            showCreate = false;
          }}
      >
        <ResponsiveGrid min="200px">
          <Input
            name="name"
            label="Name"
            required
            placeholder="e.g. network-ops"
          />
          <Input
            name="description"
            label="Description"
            placeholder="Optional"
          />
        </ResponsiveGrid>
        <div class="perm-section">
          <span>Permissions</span>
          <ResponsiveGrid min="180px">
            {#each data.allPermissions as perm}
              <Checkbox name="permissions" label={perm} value={perm} />
            {/each}
          </ResponsiveGrid>
        </div>
        <div class="form-actions">
          <Button type="submit">Create role</Button>
        </div>
      </form>
    </Card>
  {/if}

  <div class="role-list">
    {#each data.roles as role}
      <Card>
        <div class="role-header">
          <div>
            <strong class="role-name">{role.name}</strong>
            {#if role.isSystem}
              <span class="system-badge">system</span>
            {/if}
            {#if role.description}
              <p class="role-desc">{role.description}</p>
            {/if}
          </div>
          {#if !role.isSystem}
            <div class="role-btns">
              <Button
                variant="ghost"
                size="sm"
                onclick={() =>
                  (editing = editing?.id === role.id ? null : role)}
                >Edit</Button
              >
              <form method="POST" action="?/delete" use:enhance>
                <input type="hidden" name="id" value={role.id} />
                <Button
                  variant="danger"
                  size="sm"
                  onclick={(e) => {
                    if (!confirm(`Delete role "${role.name}"?`))
                      e.preventDefault();
                  }}>Delete</Button
                >
              </form>
            </div>
          {/if}
        </div>
        <div class="perm-tags">
          {#each role.permissions ?? [] as p}
            <span class="perm-tag">{p}</span>
          {:else}
            <span class="no-perm">No permissions</span>
          {/each}
        </div>

        {#if editing?.id === role.id}
          <form method="POST" action="?/update" use:enhance>
            <input type="hidden" name="id" value={role.id} />
            <ResponsiveGrid min="200px">
              <Input name="name" label="Name" value={role.name} required />
              <Input
                name="description"
                label="Description"
                value={role.description ?? ""}
              />
            </ResponsiveGrid>
            <div class="perm-section">
              <span>Permissions</span>
              <ResponsiveGrid min="180px">
                {#each data.allPermissions as perm}
                  <Checkbox
                    name="permissions"
                    label={perm}
                    value={perm}
                    checked={(role.permissions ?? []).includes(perm)}
                  />
                {/each}
              </ResponsiveGrid>
            </div>
            <div class="form-actions">
              <Button type="submit">Save</Button>
              <Button variant="secondary" onclick={() => (editing = null)}
                >Cancel</Button
              >
            </div>
          </form>
        {/if}
      </Card>
    {/each}
  </div>
</div>

<style lang="scss">
  .roles-page {
    display: grid;
    gap: 16px;
  }

  .perm-section {
    display: grid;
    gap: 8px;
    margin-top: 8px;

    > span {
      color: var(--color-muted);
      font-size: 12px;
      font-weight: 700;
    }
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .role-list {
    display: grid;
    gap: 10px;
  }

  .role-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .role-name {
    color: var(--color-text);
    font-size: 14px;
  }

  .system-badge {
    display: inline-flex;
    align-items: center;
    height: 18px;
    border-radius: 999px;
    padding: 0 7px;
    margin-left: 6px;
    color: var(--color-muted);
    background: color-mix(in srgb, var(--color-muted) 12%, transparent);
    font-size: 10px;
    font-weight: 700;
    vertical-align: middle;
  }

  .role-desc {
    margin: 4px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }

  .role-btns {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .perm-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .perm-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    border-radius: 4px;
    padding: 0 7px;
    color: var(--color-muted);
    background: color-mix(in srgb, var(--color-muted) 8%, transparent);
    font-family: ui-monospace, monospace;
    font-size: 11px;
  }

  .no-perm {
    color: var(--color-muted);
    font-size: 12px;
  }
</style>
