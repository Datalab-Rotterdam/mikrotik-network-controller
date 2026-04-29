<script lang="ts">
    import {enhance} from '$app/forms';
    import {useActionSocket} from '$lib/client/actions/use-action-socket';
    import type {ActionEvent} from '$lib/shared/action-events';
    import {placeholder} from 'drizzle-orm';

    let {data} = $props();

    type AlertEvent = (typeof data.events)[number];
    type AlertRule = (typeof data.rules)[number];
    type Channel = (typeof data.channels)[number];

    // Live alert events list
    let liveEvents = $state<AlertEvent[]>(data.events);
    let unacknowledged = $derived(liveEvents.filter((e) => !e.resolvedAt && !e.acknowledgedAt).length);

    const actions = useActionSocket();

    $effect(() =>
        actions.subscribe(['alert.fired', 'alert.resolved'], (event: ActionEvent) => {
            if (event.type === 'alert.fired') {
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
                        createdAt: new Date()
                    } as AlertEvent,
                    ...liveEvents
                ].slice(0, 50);
            }
            if (event.type === 'alert.resolved') {
                liveEvents = liveEvents.map((e) =>
                    e.id === event.payload.eventId ? {...e, resolvedAt: new Date()} : e
                );
            }
        })
    );

    // Tabs
    type Tab = 'events' | 'rules' | 'channels';
    let activeTab = $state<Tab>('events');

    // New rule form
    let showRuleForm = $state(false);
    let newRuleCondition = $state<string>('cpu_above');

    const conditionLabels: Record<string, string> = {
        device_offline: 'Device offline',
        cpu_above: 'CPU above threshold',
        memory_below: 'Free memory below threshold',
        temperature_above: 'Temperature above threshold',
        client_count_above: 'Client count above',
        client_count_below: 'Client count below',
        interface_down: 'Interface down'
    };

    const conditionUnit: Record<string, string> = {
        cpu_above: '%',
        memory_below: 'MB',
        temperature_above: '°C',
        client_count_above: 'clients',
        client_count_below: 'clients'
    };

    function hasThreshold(condition: string) {
        return condition !== 'device_offline' && condition !== 'interface_down';
    }

    function severityClass(severity: string) {
        if (severity === 'critical') return 'severity-critical';
        if (severity === 'warning') return 'severity-warning';
        return 'severity-info';
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
    let channelType = $state<string>('webhook');
</script>

<div class="page-toolbar">
    <div>
        <h1>Alerts</h1>
        <p>Rules, active events, and notification channels.</p>
    </div>
    {#if unacknowledged > 0}
        <span class="badge-critical">{unacknowledged} unacknowledged</span>
    {/if}
</div>

<div class="tab-bar" role="tablist">
    <button
            role="tab"
            class="tab-btn"
            class:tab-active={activeTab === 'events'}
            aria-selected={activeTab === 'events'}
            onclick={() => (activeTab = 'events')}
    >
        Events
        {#if liveEvents.filter((e) => !e.resolvedAt).length > 0}
            <span class="tab-count">{liveEvents.filter((e) => !e.resolvedAt).length}</span>
        {/if}
    </button>
    <button
            role="tab"
            class="tab-btn"
            class:tab-active={activeTab === 'rules'}
            aria-selected={activeTab === 'rules'}
            onclick={() => (activeTab = 'rules')}
    >
        Rules
        <span class="tab-count tab-count-neutral">{data.rules.length}</span>
    </button>
    <button
            role="tab"
            class="tab-btn"
            class:tab-active={activeTab === 'channels'}
            aria-selected={activeTab === 'channels'}
            onclick={() => (activeTab = 'channels')}
    >
        Channels
        <span class="tab-count tab-count-neutral">{data.channels.length}</span>
    </button>
</div>

<!-- ── Events tab ─────────────────────────────────────────────────────────── -->
{#if activeTab === 'events'}
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
                    {@const rule = data.rules.find((r: AlertRule) => r.id === event.ruleId)}
                    <tr class:row-resolved={!!event.resolvedAt}>
                        <td>
								<span class={`severity-badge ${severityClass(rule?.severity ?? 'info')}`}>
									{rule?.severity ?? '—'}
								</span>
                        </td>
                        <td class="col-message">{event.message}</td>
                        <td class="col-time">{relativeTime(event.firedAt)}</td>
                        <td>
                            {#if event.resolvedAt}
                                <span class="status-resolved">Resolved</span>
                            {:else if event.acknowledgedAt}
                                <span class="status-ack">Acknowledged</span>
                            {:else}
                                <span class="status-active">Active</span>
                            {/if}
                        </td>
                        <td class="col-action">
                            {#if !event.resolvedAt && !event.acknowledgedAt}
                                <form method="POST" action="?/acknowledge" use:enhance>
                                    <input type="hidden" name="id" value={event.id}/>
                                    <button type="submit" class="btn-sm">Acknowledge</button>
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
{#if activeTab === 'rules'}
    <div class="panel">
        <div class="panel-actions">
            <button class="btn-primary" onclick={() => (showRuleForm = !showRuleForm)}>
                {showRuleForm ? 'Cancel' : '+ Add rule'}
            </button>
        </div>

        {#if showRuleForm}
            <form
                    method="POST"
                    action="?/createRule"
                    class="inline-form"
                    use:enhance={() => {
					return ({ result, update }) => {
						if (result.type === 'success') showRuleForm = false;
						return update();
					};
				}}
            >
                <div class="form-row">
                    <label>
                        <span>Name</span>
                        <input type="text" name="name" required placeholder="High CPU alert"/>
                    </label>
                    <label>
                        <span>Condition</span>
                        <select name="conditionType" bind:value={newRuleCondition}>
                            {#each Object.entries(conditionLabels) as [value, label]}
                                <option {value}>{label}</option>
                            {/each}
                        </select>
                    </label>
                    {#if hasThreshold(newRuleCondition)}
                        <label>
                            <span>Threshold ({conditionUnit[newRuleCondition] ?? ''})</span>
                            <input
                                    type="number"
                                    name="threshold"
                                    required
                                    min="0"
                                    placeholder={newRuleCondition === 'memory_below' ? '64' : '90'}
                            />
                        </label>
                    {/if}
                    <label>
                        <span>Severity</span>
                        <select name="severity">
                            <option value="info">Info</option>
                            <option value="warning" selected>Warning</option>
                            <option value="critical">Critical</option>
                        </select>
                    </label>
                    <label>
                        <span>Cooldown (seconds)</span>
                        <input type="number" name="cooldownSeconds" value="300" min="60"/>
                    </label>
                </div>
                {#if data.channels.length > 0}
                    <div class="form-channels">
                        <span>Notify channels:</span>
                        {#each data.channels as channel}
                            <label class="checkbox-label">
                                <input type="checkbox" name="channelIds" value={channel.id}/>
                                {channel.name}
                            </label>
                        {/each}
                    </div>
                {/if}
                <div class="form-footer">
                    <button type="submit" class="btn-primary">Save rule</button>
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
                        <td>{conditionLabels[rule.conditionType] ?? rule.conditionType}</td>
                        <td>
								<span class={`severity-badge ${severityClass(rule.severity)}`}>
									{rule.severity}
								</span>
                        </td>
                        <td>{rule.cooldownSeconds}s</td>
                        <td>
                            <form method="POST" action="?/toggleRule" use:enhance>
                                <input type="hidden" name="id" value={rule.id}/>
                                <input type="hidden" name="enabled" value={String(!rule.enabled)}/>
                                <button type="submit" class={`toggle-btn ${rule.enabled ? 'toggle-on' : 'toggle-off'}`}>
                                    {rule.enabled ? 'On' : 'Off'}
                                </button>
                            </form>
                        </td>
                        <td class="col-action">
                            <form method="POST" action="?/deleteRule" use:enhance>
                                <input type="hidden" name="id" value={rule.id}/>
                                <button
                                        type="submit"
                                        class="btn-danger-sm"
                                        onclick={(e) => {
											if (!confirm('Delete this rule?')) e.preventDefault();
										}}
                                >
                                    Delete
                                </button>
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
{#if activeTab === 'channels'}
    <div class="panel">
        <div class="panel-actions">
            <button class="btn-primary" onclick={() => (showChannelForm = !showChannelForm)}>
                {showChannelForm ? 'Cancel' : '+ Add channel'}
            </button>
        </div>

        {#if showChannelForm}
            <form
                    method="POST"
                    action="?/createChannel"
                    class="inline-form"
                    use:enhance={() => {
					return ({ result, update }) => {
						if (result.type === 'success') showChannelForm = false;
						return update();
					};
				}}
            >
                <div class="form-row">
                    <label>
                        <span>Name</span>
                        <input type="text" name="name" required placeholder="Ops webhook"/>
                    </label>
                    <label>
                        <span>Type</span>
                        <select name="type" bind:value={channelType}>
                            <option value="webhook">Webhook</option>
                            <option value="slack">Slack</option>
                            <option value="email">Email</option>
                        </select>
                    </label>
                </div>
                <div class="form-config">
                    {#if channelType === 'webhook'}
                        {@const placeholder = {
                            "url": "https://example.com/hook",
                            "headers": {"Authorization": "Bearer ..."}
                        }}
                        <label>
                            <span>JSON config</span>
                            <textarea
                                    name="config"
                                    rows="3"
                                    placeholder={JSON.stringify(placeholder)}
                            ></textarea>
                        </label>
                    {:else if channelType === 'slack'}
                        {@const placeholder = {"webhookUrl": "https://hooks.slack.com/services/..."} }
                        <label>
                            <span>JSON config</span>
                            <textarea
                                    name="config"
                                    rows="2"
                                    placeholder={JSON.stringify(placeholder)}
                            ></textarea>
                        </label>
                    {:else if channelType === 'email'}
                        {@const placeholder = {"to": "ops@example.com"} }
                        <label>
                            <span>JSON config</span>
                            <textarea
                                    name="config"
                                    rows="3"
                                    placeholder={JSON.stringify(placeholder)}
                            ></textarea>
                        </label>
                    {/if}
                </div>
                <div class="form-footer">
                    <button type="submit" class="btn-primary">Save channel</button>
                </div>
            </form>
        {/if}

        {#if data.channels.length === 0}
            <div class="empty-state">No notification channels yet. Add one above.</div>
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
								<span class={channel.enabled ? 'status-active' : 'status-resolved'}>
									{channel.enabled ? 'Active' : 'Disabled'}
								</span>
                        </td>
                        <td class="col-action">
                            <form method="POST" action="?/deleteChannel" use:enhance>
                                <input type="hidden" name="id" value={channel.id}/>
                                <button
                                        type="submit"
                                        class="btn-danger-sm"
                                        onclick={(e) => {
											if (!confirm('Delete this channel?')) e.preventDefault();
										}}
                                >
                                    Delete
                                </button>
                            </form>
                        </td>
                    </tr>
                {/each}
                </tbody>
            </table>
        {/if}
    </div>
{/if}

<style lang="scss">
  .page-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 50px;
    margin: -18px -14px 18px;
    padding: 0 18px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);

    h1 {
      margin: 0;
      color: var(--color-muted);
      font-size: 20px;
      font-weight: 500;
      line-height: 1.2;
    }

    p {
      margin: 3px 0 0;
      color: var(--color-muted);
      font-size: 13px;
    }
  }

  .badge-critical {
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--color-danger, #ef4444);
    color: #fff;
    font-size: 12px;
    font-weight: 700;
  }

  .tab-bar {
    display: flex;
    gap: 2px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--color-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: -1px;

    &:hover {
      color: var(--color-text);
    }

    &.tab-active {
      border-bottom-color: var(--color-link);
      color: var(--color-link);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--color-danger, #ef4444);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
  }

  .tab-count-neutral {
    background: var(--color-border);
    color: var(--color-muted);
  }

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
      background: var(--color-surface-hover, color-mix(in srgb, var(--color-border) 30%, transparent));
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

  .severity-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .severity-critical {
    background: color-mix(in srgb, var(--color-danger, #ef4444) 15%, transparent);
    color: var(--color-danger, #ef4444);
  }

  .severity-warning {
    background: color-mix(in srgb, var(--color-warning, #f59e0b) 15%, transparent);
    color: var(--color-warning, #f59e0b);
  }

  .severity-info {
    background: color-mix(in srgb, var(--color-link, #3b82f6) 15%, transparent);
    color: var(--color-link, #3b82f6);
  }

  .status-active {
    color: var(--color-danger, #ef4444);
    font-size: 12px;
    font-weight: 700;
  }

  .status-ack {
    color: var(--color-warning, #f59e0b);
    font-size: 12px;
    font-weight: 700;
  }

  .status-resolved {
    color: var(--color-success, #22c55e);
    font-size: 12px;
    font-weight: 700;
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

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 160px;

      span {
        color: var(--color-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      input,
      select {
        height: 34px;
        padding: 0 10px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 13px;

        &:focus {
          outline: 2px solid var(--color-link);
          outline-offset: -1px;
        }
      }
    }
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

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-text);
    cursor: pointer;
  }

  .form-config {
    margin-bottom: 12px;

    label {
      display: flex;
      flex-direction: column;
      gap: 4px;

      span {
        color: var(--color-muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
      }

      textarea {
        padding: 8px 10px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background: var(--color-surface);
        color: var(--color-text);
        font-family: monospace;
        font-size: 12px;
        resize: vertical;

        &:focus {
          outline: 2px solid var(--color-link);
          outline-offset: -1px;
        }
      }
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
  }

  /* Buttons */
  .btn-primary {
    height: 34px;
    padding: 0 14px;
    border: none;
    border-radius: 4px;
    background: var(--color-link, #3b82f6);
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      filter: brightness(1.1);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }

    &:active {
      filter: brightness(0.95);
    }
  }

  .btn-sm {
    height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
    cursor: pointer;

    &:hover {
      border-color: var(--color-link);
      color: var(--color-link);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  .btn-danger-sm {
    height: 28px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: var(--color-danger, #ef4444);
    font-size: 12px;
    cursor: pointer;

    &:hover {
      border-color: var(--color-danger, #ef4444);
      background: color-mix(in srgb, var(--color-danger, #ef4444) 10%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--color-danger, #ef4444);
      outline-offset: 2px;
    }
  }

  .toggle-btn {
    height: 24px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;

    &.toggle-on {
      border-color: var(--color-success, #22c55e);
      background: color-mix(in srgb, var(--color-success, #22c55e) 15%, transparent);
      color: var(--color-success, #22c55e);
    }

    &.toggle-off {
      background: var(--color-surface);
      color: var(--color-muted);
    }

    &:hover {
      filter: brightness(1.1);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
  }

  @media (max-width: 768px) {
    .data-table th:nth-child(4),
    .data-table td:nth-child(4) {
      display: none;
    }
  }
</style>
