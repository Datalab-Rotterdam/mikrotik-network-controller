<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import InfoRow from "$lib/client/components/primitives/InfoRow.svelte";
  import Tag from "$lib/client/components/primitives/Tag.svelte";
  import SidePanel from "$lib/client/components/layout/SidePanel.svelte";
  import ManagerLayout from "$lib/client/components/layout/ManagerLayout.svelte";
  import PortIcon from "$lib/client/components/ui/PortIcon.svelte";
  import DevicePortLayout from "$lib/client/components/ui/DevicePortLayout.svelte";
  import type { DevicePortInterface } from "$lib/shared/device-port-layouts";

  let { data, form } = $props();

  const basePath = $derived(`/manage/${data.site.id}`);

  type FullInterface = (typeof data.interfacesByDevice)[string][number];

  let activeDeviceId = $state<string | null>(null);
  let panelDeviceId = $state<string | null>(null);
  let panelPortName = $state<string | null>(null);
  let filterStatus = $state(new Set<string>());

  const activeDevice = $derived(
    activeDeviceId ? data.devices.find((d) => d.id === activeDeviceId) ?? null : null,
  );

  const visibleRows = $derived.by<Array<FullInterface & { deviceName: string }>>(() => {
    const deviceIds = activeDeviceId ? [activeDeviceId] : data.devices.map((d) => d.id);
    let rows = deviceIds.flatMap((deviceId) => {
      const device = data.devices.find((d) => d.id === deviceId);
      return (data.interfacesByDevice[deviceId] ?? []).map((iface) => ({
        ...iface,
        deviceName: device?.name ?? device?.identity ?? deviceId,
      }));
    });
    if (filterStatus.size > 0) {
      rows = rows.filter((r) => {
        const s = r.disabled ? "disabled" : r.running ? "running" : "inactive";
        return filterStatus.has(s);
      });
    }
    return rows;
  });

  const panelDevice = $derived(
    panelDeviceId ? data.devices.find((d) => d.id === panelDeviceId) ?? null : null,
  );
  const panelInterface = $derived<FullInterface | null>(
    panelDeviceId && panelPortName
      ? (data.interfacesByDevice[panelDeviceId]?.find((i) => i.name === panelPortName) ?? null)
      : null,
  );
  const panelOpen = $derived(Boolean(panelDevice && panelPortName));
  const isManaged = $derived(
    panelDevice?.adoptionMode === "managed" && panelDevice?.connectionStatus === "online",
  );

  const FRAME_TYPE_OPTIONS = [
    { value: "admit-all", label: "Trunk" },
    { value: "admit-only-untagged-and-priority-tagged", label: "Access" },
    { value: "admit-only-vlan-tagged", label: "Tagged only" },
  ];

  const FRAME_TYPE_FULL = [
    { value: "admit-all", label: "Admit all (trunk)" },
    { value: "admit-only-untagged-and-priority-tagged", label: "Admit untagged (access)" },
    { value: "admit-only-vlan-tagged", label: "Admit tagged only" },
  ];

  function portTagVariant(row: FullInterface): "success" | "default" {
    if (row.disabled) return "default";
    if (row.running) return "success";
    return "default";
  }

  function portTagLabel(row: FullInterface): string {
    return row.disabled ? "Disabled" : row.running ? "Running" : "Inactive";
  }

  function openPort(deviceId: string, portName: string) {
    panelDeviceId = deviceId;
    panelPortName = portName;
  }

  function handlePortSelect(deviceId: string, port: DevicePortInterface | null) {
    if (!port) return;
    openPort(deviceId, port.name);
  }

  function closePanel() {
    panelDeviceId = null;
    panelPortName = null;
  }

  function normalizeDeviceStatus(status: string | null | undefined) {
    if (status === "online") return "online";
    if (status === "offline") return "offline";
    if (status === "auth_failed") return "auth_failed";
    return "unknown";
  }

  function deviceIfaceCount(deviceId: string) {
    return data.interfacesByDevice[deviceId]?.length ?? 0;
  }

  function toggleFilter(status: string) {
    const next = new Set(filterStatus);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    filterStatus = next;
  }

  const totalIfaceCount = $derived(
    data.devices.reduce((sum, d) => sum + deviceIfaceCount(d.id), 0),
  );
</script>

<ManagerLayout>
  {#snippet sidebar()}
    <div class="sidebar-inner">
      <div class="sidebar-head">
        <h1 class="sidebar-title">Port Manager</h1>
        <p class="sidebar-sub">{data.site.name}</p>
      </div>

      <nav class="device-list" aria-label="Filter by device">
        <button
          class="device-item"
          class:active={activeDeviceId === null}
          onclick={() => (activeDeviceId = null)}
        >
          <span class="device-label">All Ports</span>
          <span class="device-count">{totalIfaceCount}</span>
        </button>
        {#each data.devices as device}
          <button
            class="device-item"
            class:active={activeDeviceId === device.id}
            onclick={() => (activeDeviceId = device.id)}
          >
            <span class={`device-dot device-dot--${normalizeDeviceStatus(device.connectionStatus)}`}></span>
            <span class="device-label">{device.name ?? device.identity}</span>
            <span class="device-count">{deviceIfaceCount(device.id)}</span>
          </button>
        {/each}
      </nav>

      <div class="filter-section">
        <p class="filter-label">Status</p>
        {#each [["running", "Running"], ["disabled", "Disabled"], ["inactive", "Inactive"]] as [val, lbl]}
          <label class="filter-row">
            <input
              type="checkbox"
              checked={filterStatus.has(val)}
              onchange={() => toggleFilter(val)}
            />
            <span>{lbl}</span>
          </label>
        {/each}
      </div>
    </div>
  {/snippet}

  <!-- Main content -->
  {#if form?.message}
    <div class={form?.success ? "msg-success" : "msg-error"}>
      {form.message}
      {#if form?.jobId}
        <a class="message-link" href={`${basePath}/jobs?job=${form.jobId}`}>View task</a>
      {/if}
    </div>
  {/if}

  {#if data.devices.length === 0}
    <p class="muted">No devices adopted yet. <a href={`${basePath}/devices`}>Go to devices</a></p>
  {:else}
    {#if activeDevice}
      <div class="diagram-wrap">
        <DevicePortLayout
          model={activeDevice.model}
          interfaces={data.interfacesByDevice[activeDevice.id] ?? []}
          variant="full"
          onPortSelect={(port) => handlePortSelect(activeDevice.id, port)}
        />
      </div>
    {/if}

    <div class="table-wrap">
      <table class="ports-table">
        <thead>
          <tr>
            <th class="col-port">Port</th>
            {#if !activeDeviceId}<th class="col-device">Device</th>{/if}
            <th class="col-status">Status</th>
            <th class="col-name">Name</th>
            <th class="col-native">Native VLAN</th>
            <th class="col-frame">Frame types</th>
            <th class="col-bridge">Bridge</th>
            <th class="col-mac">MAC</th>
          </tr>
        </thead>
        <tbody>
          {#if visibleRows.length}
            {#each visibleRows as row}
              <tr
                class="port-row"
                class:selected={panelDeviceId === row.deviceId && panelPortName === row.name}
                onclick={() => openPort(row.deviceId, row.name)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === "Enter" && openPort(row.deviceId, row.name)}
              >
                <td class="col-port">
                  <div class="port-cell">
                    <PortIcon running={row.running} disabled={row.disabled} />
                    <strong class="port-name">{row.name}</strong>
                  </div>
                </td>
                {#if !activeDeviceId}
                  <td class="col-device device-dim">{row.deviceName}</td>
                {/if}
                <td class="col-status">
                  <Tag variant={portTagVariant(row)} label={portTagLabel(row)} size="sm" />
                </td>
                <td class="col-name name-dim">{row.comment ?? "—"}</td>
                <td class="col-native">{row.pvid ?? "—"}</td>
                <td class="col-frame">
                  {FRAME_TYPE_OPTIONS.find((o) => o.value === row.frameTypes)?.label ??
                    (row.frameTypes ? row.frameTypes : "—")}
                </td>
                <td class="col-bridge">{row.bridge ?? "—"}</td>
                <td class="col-mac mono">{row.macAddress ?? "—"}</td>
              </tr>
            {/each}
          {:else}
            <tr>
              <td colspan={activeDeviceId ? 7 : 8} class="empty-cell">
                No interfaces collected yet.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</ManagerLayout>

<!-- Port config side panel -->
<SidePanel
  open={panelOpen}
  title={panelPortName ?? "Port"}
  description={panelDevice?.name ?? undefined}
  closeHref={`${basePath}/ports`}
  onClose={closePanel}
>
  {#if panelInterface}
    <div class="port-panel">
      <div class="panel-card">
        <InfoRow label="Port" value={panelInterface.name} />
        <InfoRow label="Type" value={panelInterface.type ?? undefined} />
        <InfoRow label="MAC Address" value={panelInterface.macAddress ?? undefined} />
        {#if panelDevice?.connectionStatus === "online"}
          <InfoRow
            label="State"
            value={panelInterface.disabled
              ? "Disabled"
              : panelInterface.running
                ? "Running"
                : "Inactive"}
          />
        {/if}
        {#if panelInterface.bridge}
          <InfoRow label="Bridge" value={panelInterface.bridge} />
          <InfoRow label="PVID" value={panelInterface.pvid?.toString() ?? "1"} />
          <InfoRow
            label="Frame types"
            value={FRAME_TYPE_FULL.find((o) => o.value === panelInterface.frameTypes)?.label ??
              panelInterface.frameTypes ??
              "—"}
          />
        {/if}
      </div>

      {#if isManaged}
        <form
          method="POST"
          action="?/configurePort"
          class="port-form"
          use:enhance={() =>
            async ({ result, update }) => {
              await update({ reset: false });
              if (result.type === "success") closePanel();
            }}
        >
          <input type="hidden" name="deviceId" value={panelDeviceId} />
          <input type="hidden" name="portName" value={panelPortName} />
          <input type="hidden" name="bridge" value={panelInterface.bridge ?? ""} />

          <div class="panel-card form-card">
            <p class="form-section-label">Configure port</p>

            <label class="form-field">
              <span>Name / Comment</span>
              <input
                type="text"
                name="comment"
                value={panelInterface.comment ?? ""}
                placeholder="Optional label"
                maxlength="255"
              />
            </label>

            <label class="form-field">
              <span>State</span>
              <select name="disabled">
                <option value="false" selected={!panelInterface.disabled}>Enabled</option>
                <option value="true" selected={panelInterface.disabled}>Disabled</option>
              </select>
            </label>

            {#if panelInterface.bridge}
              <label class="form-field">
                <span>Native VLAN (PVID)</span>
                <input
                  type="number"
                  name="pvid"
                  min="1"
                  max="4094"
                  value={panelInterface.pvid ?? 1}
                />
              </label>

              <label class="form-field">
                <span>Frame types</span>
                <select name="frameTypes">
                  {#each FRAME_TYPE_FULL as opt}
                    <option value={opt.value} selected={panelInterface.frameTypes === opt.value}>
                      {opt.label}
                    </option>
                  {/each}
                </select>
              </label>
            {/if}
          </div>

          <Button variant="primary" fullWidth>Apply</Button>
        </form>
      {:else if panelDevice?.adoptionMode !== "managed"}
        <p class="muted panel-note">Write operations require a fully managed device.</p>
      {:else}
        <p class="muted panel-note">Device is offline — cannot apply changes.</p>
      {/if}
    </div>
  {/if}
</SidePanel>

<style lang="scss">
  /* ── Sidebar ─────────────────────────────────────────── */
  .sidebar-inner {
    padding: 18px 14px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .sidebar-head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar-title {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text);
  }

  .sidebar-sub {
    margin: 0;
    font-size: 12px;
    color: var(--color-text-muted);
  }

  /* ── Device list ─────────────────────────────────────── */
  .device-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .device-item {
    display: flex;
    align-items: center;
    gap: 7px;
    width: 100%;
    padding: 6px 8px;
    border: none;
    border-radius: 5px;
    background: transparent;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
    color: var(--color-text);
    transition: background 60ms;

    &:hover {
      background: var(--color-surface-hover, #f0f2f4);
    }

    &.active {
      background: #e8f0fe;
      color: var(--color-link);
      font-weight: 600;

      .device-count {
        color: var(--color-link);
        opacity: 0.7;
      }
    }
  }

  .device-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .device-count {
    font-size: 11px;
    color: var(--color-text-muted);
    font-weight: 500;
    flex-shrink: 0;
  }

  .device-dot {
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #c0c7cd;

    &.device-dot--online      { background: #35a861; }
    &.device-dot--offline     { background: #8a949c; }
    &.device-dot--auth_failed { background: #e8a020; }
  }

  /* ── Filters ─────────────────────────────────────────── */
  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-label {
    margin: 0 0 2px;
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-row {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: var(--color-text);
    cursor: pointer;

    input[type="checkbox"] {
      cursor: pointer;
      accent-color: var(--color-link);
    }
  }

  /* ── Table ───────────────────────────────────────────── */
  .table-wrap {
    overflow-x: auto;
  }

  .ports-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    thead th {
      padding: 7px 12px;
      border-bottom: 1px solid var(--color-border);
      text-align: left;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    tbody td {
      padding: 7px 12px;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      white-space: nowrap;
    }
  }

  .port-row {
    cursor: pointer;

    &:hover td { background: var(--color-surface-hover, #f5f7f9); }
    &.selected td { background: #eef3ff; }
  }

  /* Column widths */
  .col-port   { width: 130px; }
  .col-device { width: 160px; }
  .col-status { width: 90px; }
  .col-name   { min-width: 120px; }
  .col-native { width: 110px; }
  .col-frame  { width: 110px; }
  .col-bridge { width: 120px; }
  .col-mac    { width: 140px; }

  /* ── Port cell ───────────────────────────────────────── */
  .port-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .port-name {
    font-size: 13px;
    font-weight: 650;
  }

  /* ── Misc cells ──────────────────────────────────────── */
  .device-dim { color: var(--color-text-muted); font-size: 12px; }
  .name-dim   { color: var(--color-text-muted); font-size: 12px; }
  .mono       { font-family: monospace; font-size: 12px; }

  .empty-cell {
    text-align: center;
    color: var(--color-text-muted);
    padding: 32px;
  }

  /* ── Diagram ─────────────────────────────────────────── */
  .diagram-wrap {
    /* intentionally unstyled — DevicePortLayout handles its own card */
  }

  /* ── Flash messages ──────────────────────────────────── */
  .msg-success {
    padding: 10px 14px;
    border-radius: 6px;
    background: #ecfdf5;
    color: #065f46;
    font-size: 13px;
  }

  .msg-error {
    padding: 10px 14px;
    border-radius: 6px;
    background: #fef2f2;
    color: #991b1b;
    font-size: 13px;
  }

  .message-link {
    margin-left: 8px;
    text-decoration: underline;
  }

  /* ── Side panel ──────────────────────────────────────── */
  .port-panel {
    display: grid;
    gap: 12px;
  }

  .panel-card {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
  }

  .form-card {
    padding: 12px;
  }

  .form-section-label {
    margin: 0 0 10px;
    color: var(--color-text-muted);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .form-field {
    display: grid;
    gap: 5px;
    margin-bottom: 10px;

    span {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    input,
    select {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      font-size: 13px;
      background: var(--color-surface);
      color: var(--color-text);
    }
  }

  .port-form {
    display: grid;
    gap: 8px;
  }

  .panel-note {
    font-size: 13px;
    text-align: center;
  }

  .muted {
    color: var(--color-text-muted);
    font-size: 13px;
  }
</style>
