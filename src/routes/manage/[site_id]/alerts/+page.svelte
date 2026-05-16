<script lang="ts">
  import { enhance } from "$app/forms";
  import { useActionSocket } from "$lib/client/actions/use-action-socket";
  import type { ActionEvent } from "$lib/shared/action-events";
  import { Page, PageHeader, Tabs } from "$lib/client/components/layout";
  import { Button, Input, Select, Checkbox, TextArea, Tag, EnumBadge, StatusPill } from "$lib/client/components/primitives";

  let { data } = $props();

  type AlertEvent = (typeof data.events)[number];
  type AlertRule = (typeof data.rules)[number];
  type Channel = (typeof data.channels)[number];

  // Live alert events list
  let liveEvents = $state<AlertEvent[]>(data.events);
  let unacknowledged = $derived(
    liveEvents.filter((e) => !e.resolvedAt && !e.acknowledgedAt).length,
  );

  const actions = useActionSocket();

  $effect(() =>
    actions.subscribe(
      ["alert.fired", "alert.resolved"],
      (event: ActionEvent) => {
        if (event.type === "alert.fired") {
          // prepend placeholder — full reload will sync on next navigation
          liveEvents = [
            {
              id: event.payload.eventId,
              ruleId: event.payload.ruleId,
              siteId: event.payload.siteId,
              deviceId: event.payload.deviceId,
              firedAt: new Date(),
              resolvedAt: null,
              acknowledgedAt: null,
              acknowledgedByUserId: null,
              message: event.payload.message,
              metadata: {},
              createdAt: new Date(),
            } as AlertEvent,
            ...liveEvents,
          ].slice(0, 50);
        }
        if (event.type === "alert.resolved") {
          liveEvents = liveEvents.map((e) =>
            e.id === event.payload.eventId
              ? { ...e, resolvedAt: new Date() }
              : e,
          );
        }
      },
    ),
  );

  // Tabs
  type Tab = "events" | "rules" | "channels";
  let activeTab = $state<Tab>("events");

  // New rule form
  let showRuleForm = $state(false);
  let newRuleCondition = $state<string>("cpu_above");

  const conditionLabels: Record<string, string> = {
    device_offline: "Device offline",
    cpu_above: "CPU above threshold",
    memory_below: "Free memory below threshold",
    temperature_above: "Temperature above threshold",
    client_count_above: "Client count above",
    client_count_below: "Client count below",
    interface_down: "Interface down",
  };

  const conditionUnit: Record<string, string> = {
    cpu_above: "%",
    memory_below: "MB",
    temperature_above: "°C",
    client_count_above: "clients",
    client_count_below: "clients",
  };

  function hasThreshold(condition: string) {
    return condition !== "device_offline" && condition !== "interface_down";
  }

  function relativeTime(date: Date | string): string {
    const ms = Date.now() - new Date(date).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  // New channel form
  let showChannelForm = $state(false);
  let channelType = $state<string>("webhook");
</script>

{#snippet alertsActions()}
  {#if unacknowledged > 0}
    <Tag label="{unacknowledged} unacknowledged" variant="danger" size="sm" />
  {/if}
{/snippet}

<Page>
  <PageHeader
    title="Alerts"
    subtitle="Rules, active events, and notification channels."
    actions={alertsActions}
  />

  <Tabs
    tabs={[
      { id: 'events', label: 'Events', count: liveEvents.filter(e => !e.resolvedAt).length || undefined },
      { id: 'rules', label: 'Rules', count: data.rules.length },
      { id: 'channels', label: 'Channels', count: data.channels.length },
    ]}
    {activeTab}
    onTabChange={(id) => (activeTab = id as Tab)}
  />

<!-- ── Events tab ─────────────────────────────────────────────────────────── -->
{#if activeTab === "events"}
  <div class="panel">
    {#if liveEvents.length === 0}
      <div class="empty-state">No alert events recorded yet.</div>
    {:else}
      <table class="data-table">
        <thead>
          <tr>
            <th>Severity</th>
            <th>Message</th>
            <th>Fired</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each liveEvents as event (event.id)}
            {@const rule = data.rules.find(
              (r: AlertRule) => r.id === event.ruleId,
            )}
            <tr class:row-resolved={!!event.resolvedAt}>
              <td>
                <EnumBadge value={rule?.severity ?? "info"} preset="severity" />
              </td>
              <td class="col-message">{event.message}</td>
              <td class="col-time">{relativeTime(event.firedAt)}</td>
              <td>
                {#if event.resolvedAt}
                  <StatusPill status="resolved" label="Resolved" />
                {:else if event.acknowledgedAt}
                  <StatusPill status="acknowledged" label="Acknowledged" />
                {:else}
                  <StatusPill status="danger" label="Active" />
                {/if}
              </td>
              <td class="col-action">
                {#if !event.resolvedAt && !event.acknowledgedAt}
                  <form method="POST" action="?/acknowledge" use:enhance>
                    <input type="hidden" name="id" value={event.id} />
                    <Button type="submit" size="sm">Acknowledge</Button>
                  </form>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}

<!-- ── Rules tab ──────────────────────────────────────────────────────────── -->
{#if activeTab === "rules"}
  <div class="panel">
    <div class="panel-actions">
      <Button
        variant={showRuleForm ? "secondary" : "primary"}
        onclick={() => (showRuleForm = !showRuleForm)}
      >
        {showRuleForm ? "Cancel" : "+ Add rule"}
      </Button>
    </div>

    {#if showRuleForm}
      <form
        method="POST"
        action="?/createRule"
        class="inline-form"
        use:enhance={() => {
          return ({ result, update }) => {
            if (result.type === "success") showRuleForm = false;
            return update();
          };
        }}
      >
        <div class="form-row">
          <Input
            name="name"
            label="Name"
            required
            placeholder="High CPU alert"
          />
          <Select
            name="conditionType"
            label="Condition"
            value={newRuleCondition}
            oninput={(e: Event) =>
              (newRuleCondition = (e.target as HTMLSelectElement).value)}
            options={Object.entries(conditionLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          {#if hasThreshold(newRuleCondition)}
            <Input
              type="number"
              name="threshold"
              label={`Threshold (${conditionUnit[newRuleCondition] ?? ""})`}
              required
              placeholder={newRuleCondition === "memory_below" ? "64" : "90"}
            />
          {/if}
          <Select
            name="severity"
            label="Severity"
            value="warning"
            options={[
              { value: "info", label: "Info" },
              { value: "warning", label: "Warning" },
              { value: "critical", label: "Critical" },
            ]}
          />
          <Input
            type="number"
            name="cooldownSeconds"
            label="Cooldown (seconds)"
            value="300"
          />
        </div>
        {#if data.channels.length > 0}
          <div class="form-channels">
            <span>Notify channels:</span>
            {#each data.channels as channel}
              <Checkbox
                name="channelIds"
                label={channel.name}
                value={channel.id}
              />
            {/each}
          </div>
        {/if}
        <div class="form-footer">
          <Button type="submit">Save rule</Button>
        </div>
      </form>
    {/if}

    {#if data.rules.length === 0}
      <div class="empty-state">No alert rules yet. Add one above.</div>
    {:else}
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Condition</th>
            <th>Severity</th>
            <th>Cooldown</th>
            <th>Enabled</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.rules as rule (rule.id)}
            <tr>
              <td class="col-name">{rule.name}</td>
              <td
                >{conditionLabels[rule.conditionType] ?? rule.conditionType}</td
              >
              <td>
                <EnumBadge value={rule.severity} preset="severity" />
              </td>
              <td>{rule.cooldownSeconds}s</td>
              <td>
                <form method="POST" action="?/toggleRule" use:enhance>
                  <input type="hidden" name="id" value={rule.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={String(!rule.enabled)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant={rule.enabled ? "secondary" : "ghost"}
                  >
                    {rule.enabled ? "On" : "Off"}
                  </Button>
                </form>
              </td>
              <td class="col-action">
                <form method="POST" action="?/deleteRule" use:enhance>
                  <input type="hidden" name="id" value={rule.id} />
                  <Button
                    variant="danger"
                    size="sm"
                    onclick={(e: Event) => {
                      if (!confirm("Delete this rule?")) e.preventDefault();
                    }}
                  >
                    Delete
                  </Button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}

<!-- ── Channels tab ───────────────────────────────────────────────────────── -->
{#if activeTab === "channels"}
  <div class="panel">
    <div class="panel-actions">
      <Button
        variant={showChannelForm ? "secondary" : "primary"}
        onclick={() => (showChannelForm = !showChannelForm)}
      >
        {showChannelForm ? "Cancel" : "+ Add channel"}
      </Button>
    </div>

    {#if showChannelForm}
      <form
        method="POST"
        action="?/createChannel"
        class="inline-form"
        use:enhance={() => {
          return ({ result, update }) => {
            if (result.type === "success") showChannelForm = false;
            return update();
          };
        }}
      >
        <div class="form-row">
          <Input name="name" label="Name" required placeholder="Ops webhook" />
          <Select
            name="type"
            label="Type"
            value={channelType}
            oninput={(e: Event) =>
              (channelType = (e.target as HTMLSelectElement).value)}
            options={[
              { value: "webhook", label: "Webhook" },
              { value: "slack", label: "Slack" },
              { value: "email", label: "Email" },
            ]}
          />
        </div>
        <div class="form-config">
          {#if channelType === "webhook"}
            {@const configPlaceholder =
              '{"url": "https://example.com/hook", "headers": {"Authorization": "Bearer ..."}}'}
            <TextArea
              name="config"
              label="JSON config"
              rows={3}
              placeholder={configPlaceholder}
            />
          {:else if channelType === "slack"}
            {@const configPlaceholder =
              '{"webhookUrl": "https://hooks.slack.com/services/..."}'}
            <TextArea
              name="config"
              label="JSON config"
              rows={2}
              placeholder={configPlaceholder}
            />
          {:else if channelType === "email"}
            {@const configPlaceholder = '{"to": "ops@example.com"}'}
            <TextArea
              name="config"
              label="JSON config"
              rows={3}
              placeholder={configPlaceholder}
            />
          {/if}
        </div>
        <div class="form-footer">
          <Button type="submit">Save channel</Button>
        </div>
      </form>
    {/if}

    {#if data.channels.length === 0}
      <div class="empty-state">
        No notification channels yet. Add one above.
      </div>
    {:else}
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Enabled</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each data.channels as channel (channel.id)}
            <tr>
              <td class="col-name">{channel.name}</td>
              <td class="col-type">{channel.type}</td>
              <td>
                <StatusPill
                  status={channel.enabled ? "active" : "disabled"}
                  label={channel.enabled ? "Active" : "Disabled"}
                />
              </td>
              <td class="col-action">
                <form method="POST" action="?/deleteChannel" use:enhance>
                  <input type="hidden" name="id" value={channel.id} />
                  <Button
                    variant="danger"
                    size="sm"
                    onclick={(e: Event) => {
                      if (!confirm("Delete this channel?")) e.preventDefault();
                    }}
                  >
                    Delete
                  </Button>
                </form>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
{/if}
</Page>

<style lang="scss">
  .panel {
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    overflow: hidden;
  }

  .panel-actions {
    display: flex;
    justify-content: flex-end;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 120px;
    color: var(--color-muted);
    font-size: 13px;
    font-style: italic;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;

    th,
    td {
      height: 42px;
      padding: 0 14px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      font-size: 13px;
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    th {
      background: var(--color-surface);
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: var(--color-muted);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover td {
      background: var(
        --color-surface-hover,
        color-mix(in srgb, var(--color-border) 30%, transparent)
      );
    }

    .row-resolved td {
      opacity: 0.5;
    }
  }

  .col-message {
    max-width: 360px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-name {
    font-weight: 600;
  }

  .col-time,
  .col-type {
    color: var(--color-muted);
    font-size: 12px;
  }

  .col-action {
    width: 120px;
    text-align: right;
  }

  /* Forms */
  .inline-form {
    padding: 14px;
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-border) 15%, transparent);
  }

  .form-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }

  .form-channels {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 13px;
    color: var(--color-muted);
  }

  .form-config {
    margin-bottom: 12px;
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
  }

  @media (max-width: 768px) {
    .data-table th:nth-child(4),
    .data-table td:nth-child(4) {
      display: none;
    }
  }
</style>
