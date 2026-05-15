<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Form from "$lib/client/components/primitives/Form.svelte";
  import Icon from "$lib/client/components/primitives/Icon.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import TableSkeleton from "$lib/client/components/primitives/TableSkeleton.svelte";
  import EmptyState from "$lib/client/components/primitives/EmptyState.svelte";
  import StatusBadge from "$lib/client/components/primitives/StatusBadge.svelte";
  import InfoRow from "$lib/client/components/primitives/InfoRow.svelte";
  import Tag from "$lib/client/components/primitives/Tag.svelte";
  import Tooltip from "$lib/client/components/primitives/Tooltip.svelte";
  import SidePanel from "$lib/client/components/layout/SidePanel.svelte";
  import { Tabs } from "$lib/client/components/layout";
  import DevicePortLayout from "$lib/client/components/ui/DevicePortLayout.svelte";
  import { Page, PageHeader } from "$lib/client/components/layout";
  import {
    discoveredDevices,
    initializeDiscoveryDeviceSnapshot,
  } from "$lib/client/stores/discovery-updates";
  import {
    devicesState,
    setDevicesState,
    removeDevice,
    processDeviceAdopted,
    updateDevice,
  } from "$lib/client/stores/devices";
  import {
    formatJobStatus,
    getCurrentStep,
    getJobsForDevice,
    isRunningJob,
    jobsState,
  } from "$lib/client/stores/jobs";
  import { useActionSocket } from "$lib/client/actions/use-action-socket";

  let { data, form } = $props();
  const basePath = $derived(`/manage/${data.site.id}`);
  const adoptionPanelOpen = $derived(
    data.adoptionPanel.open ||
      (form?.action === "adopt" && Boolean(form?.message)),
  );
  const panelHost = $derived(form?.host ?? data.adoptionPanel.host);
  const panelPlatform = $derived(form?.platform ?? data.adoptionPanel.platform);
  const panelApiPort = $derived(
    form?.apiPort ?? (panelPlatform === "switchos" ? 80 : 8728),
  );
  const panelSiteName = $derived(form?.siteName ?? data.adoptionPanel.siteName);
  const panelDiscovery = $derived({
    identity: form?.discoveryIdentity ?? data.adoptionPanel.discovery.identity,
    macAddress:
      form?.discoveryMacAddress ?? data.adoptionPanel.discovery.macAddress,
    version: form?.discoveryVersion ?? data.adoptionPanel.discovery.version,
    hardware: form?.discoveryHardware ?? data.adoptionPanel.discovery.hardware,
    interfaceName:
      form?.discoveryInterfaceName ??
      data.adoptionPanel.discovery.interfaceName,
  });
  const panelHasDiscoveryContext = $derived(
    Boolean(
      panelDiscovery.identity ||
        panelDiscovery.macAddress ||
        panelDiscovery.version ||
        panelDiscovery.hardware ||
        panelDiscovery.interfaceName,
    ),
  );
  const selectedDeviceId = $derived(data.selectedDeviceId);

  onMount(() => {
    initializeDiscoveryDeviceSnapshot(data.discoveredDevices);

    const devices = data.devices.map((device) => {
      const ifaces = data.deviceInterfaces[device.id] ?? [];
      const primaryInterface =
        ifaces.find((i) => i.running === true) ?? ifaces[0];
      return {
        id: device.id,
        type: (device.platform === "switchos" ? "switch" : "router") as
          | "router"
          | "switch",
        name: device.name ?? device.identity,
        identity: device.identity ?? "",
        status: device.connectionStatus,
        model: device.model ?? "",
        version: device.routerOsVersion ?? "",
        ipAddress: device.host,
        platform: device.platform,
        adopted: true,
        adoptionMode: device.adoptionMode,
        adoptionState: device.adoptionState,
        image: data.deviceImages[device.id],
        interfaces: ifaces,
        macAddress: primaryInterface?.macAddress ?? "",
        details: {
          identity: device.identity ?? "",
          serialNumber: device.serialNumber ?? "",
          architecture: device.architecture ?? "",
          uptimeSeconds: device.uptimeSeconds ?? undefined,
          lastSeenAt: device.lastSeenAt,
          lastSyncAt: device.lastSyncAt,
          capabilities: device.capabilities,
          tags: device.tags,
        },
      };
    });

    const discovered = data.discoveredDevices
      .filter((device) => device.address)
      .map((device) => ({
        id: device.id,
        identity: device.identity,
        macAddress: device.macAddress,
        platform: device.platform,
        version: device.version,
        hardware: device.hardware,
        interfaceName: device.interfaceName,
        address: device.address,
      }));

    setDevicesState({
      devices,
      interfaces: data.interfaces,
      deviceInterfaces: data.deviceInterfaces,
      discoveredDevices: discovered,
      deviceImages: data.deviceImages,
    });

    return undefined;
  });

  const adoptedHosts = $derived(
    new Set(data.devices.map((device) => device.host)),
  );
  const runtimeDiscoveredDevices = $derived(
    $discoveredDevices.length ? $discoveredDevices : data.discoveredDevices,
  );
  const discoveredRows = $derived(
    runtimeDiscoveredDevices
      .filter((device) => device.address && !adoptedHosts.has(device.address))
      .map((device) => ({
        id: device.id,
        type: "router",
        name: device.identity ?? "Discovered MikroTik",
        identity: device.identity ?? "",
        status: "Discovered",
        model: device.hardware ?? device.platform ?? "",
        version: device.version ?? "",
        ipAddress: device.address ?? "",
        platform: device.platform ?? "routeros",
        adopted: false,
        adoptionMode: "read_only",
        adoptionState: "discovered",
        image: data.deviceImages[device.id],
        interfaces: [],
        macAddress: device.macAddress ?? "",
        discoveryInterfaceName: device.interfaceName ?? "",
        details: {
          identity: device.identity ?? "",
          serialNumber: "",
          architecture: "",
          uptimeSeconds: undefined,
          lastSeenAt: undefined,
          lastSyncAt: undefined,
          capabilities: [],
          tags: [],
        },
      })),
  );

  const adoptedRows = $derived(
    data.devices.map((device) => {
      const liveDevice = $devicesState.devices.find((d) => d.id === device.id);
      const ifaces = data.deviceInterfaces[device.id] ?? [];
      const primaryInterface =
        ifaces.find((i) => i.running === true) ?? ifaces[0];
      return {
        id: device.id,
        type: device.platform === "switchos" ? "switch" : "router",
        name: device.name ?? device.identity,
        identity: device.identity ?? "",
        status: liveDevice?.status ?? device.connectionStatus,
        model: device.model ?? "",
        version: device.routerOsVersion ?? "",
        ipAddress: device.host,
        platform: device.platform,
        adopted: true,
        adoptionMode: device.adoptionMode,
        adoptionState: device.adoptionState,
        image: data.deviceImages[device.id],
        interfaces: ifaces,
        macAddress: primaryInterface?.macAddress ?? "",
        firmware: data.firmwareByDeviceId[device.id] ?? null,
        details: {
          identity: device.identity ?? "",
          serialNumber: device.serialNumber ?? "",
          architecture: device.architecture ?? "",
          uptimeSeconds: device.uptimeSeconds,
          lastSeenAt: device.lastSeenAt,
          lastSyncAt: device.lastSyncAt,
          capabilities: device.capabilities,
          tags: device.tags,
        },
      };
    }),
  );

  const rows = $derived([...adoptedRows, ...discoveredRows]);
  const adoptedCount = $derived(adoptedRows.length);
  const discoveredCount = $derived(discoveredRows.length);

  type FilterTab = "all" | "online" | "offline";
  let filterTab = $state<FilterTab>("all");
  const filterTabDefs = $derived([
    { id: "all", label: "All", count: rows.length },
    {
      id: "online",
      label: "Online",
      count: adoptedRows.filter((d) => d.status === "online").length,
    },
    {
      id: "offline",
      label: "Offline",
      count: adoptedRows.filter(
        (d) => d.status === "offline" || d.status === "auth_failed",
      ).length,
    },
  ]);
  const visibleRows = $derived(
    filterTab === "online"
      ? adoptedRows.filter((d) => d.status === "online")
      : filterTab === "offline"
        ? adoptedRows.filter(
            (d) => d.status === "offline" || d.status === "auth_failed",
          )
        : rows,
  );

  const selectedDevice = $derived(
    rows.find((device) => device.id === selectedDeviceId),
  );
  const detailsPanelOpen = $derived(
    Boolean(selectedDevice) && !adoptionPanelOpen,
  );
  const anyPanelOpen = $derived(adoptionPanelOpen || detailsPanelOpen);
  const selectedDeviceJobs = $derived(
    selectedDevice
      ? getJobsForDevice($jobsState.jobs, selectedDevice.id).slice(0, 5)
      : [],
  );
  const selectedDeviceRunningJobs = $derived(
    selectedDeviceJobs.filter((job) => isRunningJob(job)),
  );
  const selectedDeviceProvisioned = $derived(
    Boolean(
      selectedDevice?.adopted &&
        (selectedDevice.adoptionState === "fully_managed" ||
          selectedDevice.adoptionMode === "managed"),
    ),
  );

  function deviceHref(deviceId: string) {
    return `${basePath}/devices?device=${encodeURIComponent(deviceId)}`;
  }

  function platformParam(platform: string | undefined) {
    return platform === "switchos" ? "switchos" : "routeros";
  }

  function adoptHref(device: {
    ipAddress: string;
    platform?: string;
    name?: string;
    macAddress?: string;
    version?: string;
    model?: string;
    uplink?: string;
  }) {
    const params = new URLSearchParams({
      adopt: device.ipAddress,
      platform: platformParam(device.platform),
    });

    if (device.name) params.set("identity", device.name);
    if (device.macAddress) params.set("mac", device.macAddress);
    if (device.version) params.set("version", device.version);
    if (device.model) params.set("hardware", device.model);
    if (device.uplink) params.set("interface", device.uplink);

    return `${basePath}/devices?${params.toString()}`;
  }

  function openDevice(event: MouseEvent, deviceId: string) {
    const target = event.target as HTMLElement;

    if (target.closest("a, button, input, select, textarea, summary")) {
      return;
    }

    void goto(deviceHref(deviceId));
  }

  function openDeviceFromKeyboard(event: KeyboardEvent, deviceId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    void goto(deviceHref(deviceId));
  }

  function formatUptime(seconds: number | null | undefined) {
    if (seconds === undefined || seconds === null) {
      return "-";
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return [
      days ? `${days}d` : "",
      hours ? `${hours}h` : "",
      minutes || (!days && !hours) ? `${minutes}m` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  function formatDate(value: string | Date | null | undefined) {
    if (!value) {
      return "-";
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  // Real-time updates via WebSocket
  try {
    const bus = useActionSocket();
    bus.subscribe(
      ["device.adopted", "device.removed", "device.updated"],
      (event) => {
        if (event.type === "device.adopted") {
          processDeviceAdopted(event.payload);
        } else if (event.type === "device.removed") {
          removeDevice(event.payload.deviceId);
        } else if (
          event.type === "device.updated" &&
          event.payload.connectionStatus
        ) {
          updateDevice(event.payload.deviceId, {
            status: event.payload.connectionStatus,
          });
        }
      },
    );
  } catch {
    // ActionSocket not available — real-time updates disabled
  }

  // Normalize status values for StatusBadge
  type StatusValue =
    | "online"
    | "offline"
    | "auth_failed"
    | "blocked"
    | "unknown"
    | "discovered";
  function normalizeStatus(status: string): StatusValue {
    const normalized = status.toLowerCase().replace(/\s+/g, "_");
    if (
      [
        "online",
        "offline",
        "auth_failed",
        "blocked",
        "unknown",
        "discovered",
      ].includes(normalized)
    ) {
      return normalized as StatusValue;
    }
    return "unknown";
  }

  function confirmRemove(event: SubmitEvent) {
    if (!selectedDevice) {
      event.preventDefault();
      return;
    }

    const confirmed = confirm(
      `Factory reset ${selectedDevice.name} and remove it from the controller? This will erase the device configuration and reboot it.`,
    );

    if (!confirmed) {
      event.preventDefault();
    }
  }
</script>

{#snippet devicesActions()}
  <div class="devices-toolbar">
    <input
      class="search-input"
      type="search"
      placeholder="Search"
      aria-label="Search devices"
    />
    <a
      class="adopt-btn"
      href={`${basePath}/devices?adopt=`}
      aria-label="Adopt device"
      title="Adopt device"
    >
      <Icon name="plus" size={16} />
      Adopt
    </a>
  </div>
{/snippet}

<Page>
  <PageHeader
    title="Devices"
    subtitle={`${adoptedCount} adopted · ${discoveredCount} discovered`}
    actions={devicesActions}
  />

  <Tabs
    tabs={filterTabDefs}
    activeTab={filterTab}
    variant="pills"
    ariaLabel="Device filters"
    onTabChange={(id) => (filterTab = id as FilterTab)}
  />

  <div class="devices-table-wrap" class:panel-open={anyPanelOpen}>
    {#if $devicesState.loading}
      <TableSkeleton columns={7} rows={6} />
    {:else if visibleRows.length}
      <table class="devices-table">
        <thead>
          <tr>
            <th class="col-state" style="width: 16px;"></th>
            <th class="col-type" style="width: 36px;"></th>
            <th class="col-name">Name</th>
            <th class="col-status">Status</th>
            <th class="col-model">Model</th>
            <th class="col-version">Version</th>
            <th class="col-ip">IP Address</th>
          </tr>
        </thead>
        <tbody>
          {#each visibleRows as device}
            <tr
              class="device-row"
              class:selected={device.id === selectedDeviceId}
              role="button"
              tabindex="0"
              aria-label={device.adopted
                ? `Open ${device.name} details`
                : `Adopt ${device.name}`}
              onclick={(event) => openDevice(event, device.id)}
              onkeydown={(event) => openDeviceFromKeyboard(event, device.id)}
            >
              <td class="col-state">
                <span
                  class="device-dot"
                  class:online={device.status === "online"}
                  class:offline={device.status === "offline"}
                  class:error={device.status === "auth_failed" ||
                    device.status === "blocked"}
                  class:discovered={!device.adopted}
                ></span>
              </td>
              <td class="col-type">
                <img
                  src={device.image.src}
                  alt=""
                  width="24"
                  height="24"
                  class="device-type-icon"
                />
              </td>
              <td class="col-name">
                {#if device.adopted && device.identity}
                  <Tooltip text={device.identity}>
                    <span class="device-name-text">{device.name}</span>
                  </Tooltip>
                {:else}
                  <span class="device-name-text">{device.name}</span>
                {/if}
              </td>
              <td class="col-status">
                {#if device.adopted}
                  <StatusBadge status={normalizeStatus(device.status)} />
                {:else}
                  <a class="adopt-status-link" href={adoptHref(device)}>
                    Adopt device
                  </a>
                {/if}
              </td>
              <td class="col-model">{device.model || "—"}</td>
              <td class="col-version">
                <span class="version-cell">
                  {device.version || "—"}
                  {#if device.adopted && (device as any).firmware?.updateAvailable}
                    <Tag label="Update" variant="warning" size="sm" />
                  {/if}
                </span>
              </td>
              <td class="col-ip">{device.ipAddress}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <EmptyState
        icon="device-screen"
        title="No MikroTik Devices Have Been Adopted"
        description="If devices are missing, make sure they are online and reachable from the controller."
      >
        <a class="adopt-link" href={`${basePath}/devices?adopt=`}>
          <Button variant="primary">Adopt Device</Button>
        </a>
      </EmptyState>
    {/if}
  </div>
  <SidePanel
    open={adoptionPanelOpen}
    title="Adopt device"
    description="Enter credentials or prepare a bootstrap task."
    closeHref={`${basePath}/devices`}
  >
    <Form action="?/adopt">
      {#if form?.message}
        <div class={form?.success ? "status-success" : "error-message"}>
          {form.message}
          {#if form?.jobId}
            <a class="message-link" href={`${basePath}/jobs?job=${form.jobId}`}
              >View task</a
            >
          {/if}
        </div>
      {/if}

      <input type="hidden" name="mode" value="credentials" />
      <input
        type="hidden"
        name="discoveryIdentity"
        value={panelDiscovery.identity}
      />
      <input
        type="hidden"
        name="discoveryMacAddress"
        value={panelDiscovery.macAddress}
      />
      <input
        type="hidden"
        name="discoveryVersion"
        value={panelDiscovery.version}
      />
      <input
        type="hidden"
        name="discoveryHardware"
        value={panelDiscovery.hardware}
      />
      <input
        type="hidden"
        name="discoveryInterfaceName"
        value={panelDiscovery.interfaceName}
      />

      {#if panelHasDiscoveryContext}
        <div class="discovery-context">
          <strong>MNDP discovery</strong>
          {#if panelDiscovery.identity}
            <div class="info-row">
              <span>Identity</span>
              <strong>{panelDiscovery.identity}</strong>
            </div>
          {/if}
          {#if panelDiscovery.hardware}
            <div class="info-row">
              <span>Hardware</span>
              <strong>{panelDiscovery.hardware}</strong>
            </div>
          {/if}
          {#if panelDiscovery.version}
            <div class="info-row">
              <span>Version</span>
              <strong>{panelDiscovery.version}</strong>
            </div>
          {/if}
          {#if panelDiscovery.macAddress}
            <div class="info-row">
              <span>MAC Address</span>
              <strong>{panelDiscovery.macAddress}</strong>
            </div>
          {/if}
          {#if panelDiscovery.interfaceName}
            <div class="info-row">
              <span>Interface</span>
              <strong>{panelDiscovery.interfaceName}</strong>
            </div>
          {/if}
        </div>
      {/if}

      <Input
        label="Username"
        name="username"
        autocomplete="username"
        value={form?.username ?? "admin"}
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autocomplete="current-password"
      />

      <details class="advanced-settings">
        <summary>Advanced settings</summary>
        <div class="advanced-fields">
          <Input
            label="Host"
            name="host"
            placeholder="192.168.88.1"
            value={panelHost}
            required
          />
          <Input
            label="API port"
            name="apiPort"
            inputmode="numeric"
            value={panelApiPort}
            required
          />
          <Input label="Site" name="siteName" value={panelSiteName} required />
          <Input
            label="Management CIDRs"
            name="managementCidrs"
            placeholder="10.10.0.0/16,100.64.0.0/10"
            value={form?.managementCidrs ?? ""}
          />
          <label class="field">
            <span>Device OS</span>
            <select name="platform">
              <option value="routeros" selected={panelPlatform !== "switchos"}
                >RouterOS</option
              >
              <option value="switchos" selected={panelPlatform === "switchos"}
                >SwitchOS</option
              >
            </select>
          </label>
        </div>
      </details>

      <Button type="submit" variant="primary" fullWidth>Adopt</Button>
    </Form>

    <Form action="?/adopt" compact ariaLabel="Prepare bootstrap">
      <input type="hidden" name="mode" value="bootstrap" />
      <input type="hidden" name="siteName" value={panelSiteName} />
      <details class="advanced-settings">
        <summary>Bootstrap fallback</summary>
        <div class="advanced-fields">
          <Input
            label="Management CIDRs"
            name="managementCidrs"
            placeholder="10.10.0.0/16,100.64.0.0/10"
            value={form?.managementCidrs ?? ""}
          />
          <Button variant="secondary" type="submit" fullWidth
            >Prepare Bootstrap Task</Button
          >
        </div>
      </details>
    </Form>
  </SidePanel>

  {#if selectedDevice}
    <SidePanel
      open={detailsPanelOpen}
      title={selectedDevice.name}
      closeHref={`${basePath}/devices`}
    >
      <div class="device-details">
        <div class="device-hero">
          <img src={selectedDevice.image.src} alt="" width="112" height="76" />
          <h3>{selectedDevice.name}</h3>
          <p>{selectedDevice.model || "MikroTik device"}</p>
          {#if selectedDevice.adopted}
            <a
              class="open-device-page"
              href={`${basePath}/devices/${selectedDevice.id}`}
              aria-label={`Open ${selectedDevice.name} full device page`}
            >
              <Icon name="external-link" size={16} />
              Open full page
            </a>
          {/if}
        </div>

        <div class="details-card">
          <InfoRow label="Version" value={selectedDevice.version || undefined} />
          <InfoRow label="IP Address" value={selectedDevice.ipAddress || undefined} />
          <InfoRow label="MAC Address" value={selectedDevice.macAddress || undefined} />
          <InfoRow label="Model" value={selectedDevice.model || undefined} />
          {#if selectedDevice.adopted}
            <InfoRow label="Serial" value={selectedDevice.details.serialNumber || undefined} />
            <InfoRow label="Architecture" value={selectedDevice.details.architecture || undefined} />
            <InfoRow label="Last Sync" value={formatDate(selectedDevice.details.lastSyncAt)} />
            {#if selectedDevice.status === 'online'}
              <InfoRow label="Uptime" value={formatUptime(selectedDevice.details.uptimeSeconds)} />
            {/if}
          {/if}
        </div>

        {#if selectedDevice.adopted && selectedDeviceJobs.length}
          <div class="details-card">
            <div class="card-heading">
              <strong>Tasks</strong>
              <a class="card-link" href={`${basePath}/jobs`}>View all</a>
            </div>
            {#each selectedDeviceJobs as job}
              {@const currentStep = getCurrentStep(job)}
              <a class="task-block" href={`${basePath}/jobs?job=${job.id}`}>
                <div class="task-title">
                  <strong>{job.type}</strong>
                  <span class:active={isRunningJob(job)}
                    >{formatJobStatus(job.status)}</span
                  >
                </div>
                <div
                  class="task-progress"
                  aria-label={`${job.progress}% complete`}
                >
                  <span style={`width: ${job.progress}%`}></span>
                </div>
                <div class="task-meta">
                  <span>{currentStep?.name ?? "No steps"}</span>
                  <span>{job.progress}%</span>
                </div>
              </a>
            {/each}
            {#if selectedDeviceRunningJobs.length}
              <p class="muted">
                {selectedDeviceRunningJobs.length} task{selectedDeviceRunningJobs.length ===
                1
                  ? ""
                  : "s"} running now.
              </p>
            {/if}
          </div>
        {/if}

        {#if selectedDevice.adopted && selectedDevice.status === 'online' && selectedDevice.platform === "routeros"}
          {@const fwData = selectedDevice as any}
          {@const fw = fwData.firmware}
          <div class="details-card">
            <div class="card-heading">
              <strong>Firmware</strong>
              {#if fw?.checkedAt}
                <span class="card-meta">Checked {formatDate(fw.checkedAt)}</span
                >
              {/if}
            </div>
            <InfoRow
              label="Installed"
              value={(fw?.currentVersion ?? selectedDevice.version) || undefined}
            />
            {#if fw?.latestVersion}
              <InfoRow label={`Latest (${fw.channel ?? "stable"})`} value={fw.latestVersion} />
            {/if}
            {#if form?.action === "firmwareCheck" && form?.message}
              <div class={form?.success ? "status-success" : "error-message"}>
                {form.message}
                {#if form?.jobId}
                  <a
                    class="message-link"
                    href={`${basePath}/jobs?job=${form.jobId}`}>View task</a
                  >
                {/if}
              </div>
            {/if}
            {#if form?.action === "firmwareUpgrade" && form?.message}
              <div class={form?.success ? "status-success" : "error-message"}>
                {form.message}
                {#if form?.jobId}
                  <a
                    class="message-link"
                    href={`${basePath}/jobs?job=${form.jobId}`}>View task</a
                  >
                {/if}
              </div>
            {/if}
            <div class="fw-actions">
              <form method="POST" action="?/firmwareCheck">
                <input
                  type="hidden"
                  name="deviceId"
                  value={selectedDevice.id}
                />
                <Button variant="secondary" size="sm">Check for updates</Button>
              </form>
              {#if fw?.updateAvailable}
                <form method="POST" action="?/firmwareUpgrade">
                  <input
                    type="hidden"
                    name="deviceId"
                    value={selectedDevice.id}
                  />
                  <Button
                    variant="warning"
                    fullWidth
                    onclick={(e) => {
                      if (
                        !confirm(
                          `Upgrade ${selectedDevice.name} to ${fw.latestVersion}? Device will reboot.`,
                        )
                      )
                        e.preventDefault();
                    }}
                  >
                    Upgrade to {fw.latestVersion}
                  </Button>
                </form>
              {/if}
            </div>
          </div>
        {/if}

        {#if selectedDevice.adopted && selectedDevice.status === 'online' && !selectedDeviceProvisioned}
          <div class="details-card">
            <div class="card-heading">
              <strong>Provisioning</strong>
              <a class="card-link" href={`${basePath}/jobs`}>Tasks</a>
            </div>
            {#if form?.action === "provision" && form?.message}
              <div class={form?.success ? "status-success" : "error-message"}>
                {form.message}
                {#if form?.jobId}
                  <a
                    class="message-link"
                    href={`${basePath}/jobs?job=${form.jobId}`}>View task</a
                  >
                {/if}
              </div>
            {/if}
            <form
              class="remove-form"
              method="POST"
              action="?/provision"
              aria-label={`Provision ${selectedDevice.name}`}
            >
              <input type="hidden" name="deviceId" value={selectedDevice.id} />
              <Button variant="primary" fullWidth>Provision</Button>
            </form>
          </div>
        {/if}

        {#if selectedDevice.adopted}
          <div class="details-card danger-card">
            <div class="card-heading">
              <strong>Remove device</strong>
            </div>
            {#if form?.action === "remove" && form?.message}
              <div class={form?.success ? "status-success" : "error-message"}>
                {form.message}
              </div>
            {/if}
            <form
              class="remove-form"
              method="POST"
              action="?/remove"
              aria-label={`Remove ${selectedDevice.name}`}
              onsubmit={confirmRemove}
            >
              <input type="hidden" name="deviceId" value={selectedDevice.id} />
              <Button
                variant="danger"
                fullWidth
                onclick={(e: Event) => {
                  if (
                    !confirm(
                      `Factory reset ${selectedDevice.name} and remove it from the controller? Device will reboot.`,
                    )
                  )
                    e.preventDefault();
                }}
              >
                Reset & Remove
              </Button>
            </form>
          </div>
        {/if}

        {#if selectedDevice.adopted && selectedDevice.interfaces.length}
          <div class="details-card">
            <div class="card-heading">
              <strong>Interfaces</strong>
              <span>{selectedDevice.interfaces.length}</span>
            </div>
            <DevicePortLayout
              model={selectedDevice.model || selectedDevice.name}
              interfaces={selectedDevice.interfaces}
              variant="compact"
            />
          </div>
        {:else if !selectedDevice.adopted}
          <a
            class="adopt-submit detail-action"
            href={adoptHref(selectedDevice)}
          >
            Adopt
          </a>
        {/if}
      </div>
    </SidePanel>
  {/if}
</Page>

<style lang="scss">
  .devices-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input {
    width: min(220px, 100%);
    height: 32px;
    border: 1px solid var(--color-line, #dedfde);
    border-radius: var(--radius-sm, 3px);
    padding: 0 10px;
    color: var(--color-text, #171717);
    background: var(--color-surface);
    font-size: 13px;

    &:focus {
      outline: none;
      border-color: var(--color-brand);
    }
  }

  .adopt-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 32px;
    border: 1px solid var(--color-line, #dedfde);
    border-radius: var(--radius-sm, 3px);
    padding: 0 10px;
    color: var(--color-text, #171717);
    background: var(--color-surface);
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      border-color: var(--color-brand);
      color: var(--color-brand);
    }
  }

  .devices-table-wrap {
    border-top: 1px solid #eef1f3;
    background: var(--color-surface);
    min-width: 0;
  }

  .devices-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  .devices-table th,
  .devices-table td {
    height: 42px;
    padding: 0 14px;
    border-bottom: 1px solid #f0f2f4;
    color: #323a40;
    font-size: 13px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .devices-table th {
    color: #2f3438;
    font-weight: 800;
  }

  .device-row {
    cursor: pointer;
    outline: 0;
  }

  .device-row:focus-visible td {
    box-shadow: inset 0 0 0 2px rgba(0, 100, 255, 0.16);
  }

  .device-row:hover,
  .device-row.selected {
    background: var(--color-page, #f8f9fa);
  }

  .adopt-status-link {
    display: inline-flex;
    align-items: center;
    height: 22px;
    border: 1px solid var(--color-brand-light, #bfdbfe);
    border-radius: var(--radius-pill, 999px);
    padding: 0 10px;
    color: var(--color-link, #0d6fd6);
    background: rgba(13, 111, 214, 0.06);
    font-size: 11px;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      background: rgba(13, 111, 214, 0.12);
    }
  }

  .adopt-link {
    text-decoration: none;
  }

  .device-type-icon {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  .device-name-text {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
  }

  .device-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-muted, #9aa3aa);
  }

  .device-dot.online {
    background: var(--color-success, #16a34a);
  }

  .device-dot.offline {
    background: var(--color-muted, #9aa3aa);
  }

  .device-dot.error {
    background: var(--color-danger, #dc2626);
  }

  .device-dot.discovered {
    background: var(--color-warning, #f59e0b);
  }

  .advanced-settings {
    border: 1px solid #eef1f3;
    border-radius: 4px;
    background: #fbfdff;
  }

  .discovery-context {
    display: grid;
    gap: 8px;
    border: 1px solid #e5ebef;
    border-radius: 6px;
    padding: 12px;
    background: #fbfdff;
  }

  .discovery-context > strong {
    color: #323a40;
    font-size: 13px;
  }

  .advanced-settings summary {
    min-height: 38px;
    padding: 10px 12px;
    color: #323a40;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .advanced-fields {
    display: grid;
    gap: 12px;
    padding: 0 12px 12px;
  }

  .field {
    display: grid;
    gap: 7px;
    color: #282a29;
    font-size: 14px;
    font-weight: 650;
  }

  .field select {
    width: 100%;
    border: 1px solid var(--color-brand-light);
    border-radius: 6px;
    padding: 11px 12px;
    color: var(--color-brand);
    background: var(--color-surface);
  }

  .field select:focus {
    border-color: var(--color-brand);
    outline: 3px solid rgba(14, 14, 16, 0.14);
  }

  .adopt-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 42px;
    border: 1px solid var(--color-brand);
    border-radius: 6px;
    padding: 0 16px;
    color: var(--color-surface);
    background: var(--color-brand);
    font-weight: 750;
    cursor: pointer;
  }

  .message-link {
    display: block;
    margin-top: 6px;
    color: inherit;
    font-weight: 800;
    text-decoration: underline;
  }

  .error-message {
    border: 1px solid #efb8b8;
    border-radius: 6px;
    padding: 10px 12px;
    color: var(--color-danger);
    background: #fff2f2;
  }

  .status-success {
    border: 1px solid #a8d9c8;
    border-radius: 6px;
    padding: 10px 12px;
    color: #0d5f48;
    background: #effaf5;
  }

  .device-details {
    display: grid;
    gap: 16px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .device-hero {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 18px 0 6px;
    text-align: center;
  }

  .device-hero img {
    width: 112px;
    height: 76px;
    object-fit: contain;
  }

  .device-hero h3 {
    margin: 0;
    color: #3a4248;
    font-size: 17px;
  }

  .device-hero p {
    margin: 0;
    color: #8a949c;
    font-size: 13px;
  }

  .open-device-page {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    border: 1px solid #dce4e9;
    border-radius: 5px;
    padding: 0 10px;
    color: var(--color-link);
    background: var(--color-surface);
    font-size: 12px;
    font-weight: 750;
    text-decoration: none;
  }

  .open-device-page:hover {
    border-color: var(--color-link);
    background: #eef6ff;
  }

  .details-card {
    display: grid;
    gap: 14px;
    border-radius: 6px;
    padding: 16px;
    background: #fbfdff;
  }

  .danger-card {
    border: 1px solid #f1c7c7;
    background: #fff8f8;
  }

  .remove-form {
    display: grid;
    gap: 10px;
  }

  .fw-actions {
    display: grid;
    gap: 6px;
    margin-top: 4px;
  }

  .version-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .card-meta {
    color: var(--color-muted, #8a949c);
    font-size: 11px;
    font-weight: 400;
  }

  .card-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #30373d;
  }

  .card-heading span {
    color: #9aa3aa;
    font-size: 12px;
  }

  .card-link {
    color: var(--color-link);
    font-size: 12px;
    font-weight: 700;
  }

  .task-block {
    display: grid;
    gap: 8px;
    border-top: 1px solid #eef1f3;
    padding-top: 12px;
    color: inherit;
    text-decoration: none;
  }

  .task-block:first-of-type {
    border-top: 0;
    padding-top: 0;
  }

  .task-title,
  .task-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  .task-title strong {
    min-width: 0;
    color: #30373d;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .task-title span {
    color: #8a949c;
    font-size: 12px;
    white-space: nowrap;
  }

  .task-title span.active {
    color: var(--color-link);
  }

  .task-progress {
    height: 5px;
    border-radius: 999px;
    background: #e8edf1;
    overflow: hidden;
  }

  .task-progress span {
    display: block;
    height: 100%;
    min-width: 3px;
    border-radius: inherit;
    background: var(--color-link);
  }

  .task-meta {
    color: #8a949c;
    font-size: 12px;
  }

  .muted {
    margin: 0;
    color: #8a949c;
    font-size: 13px;
  }

  .detail-action {
    text-decoration: none;
  }

  @media (max-width: 900px) {
    .devices-table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-gutter: stable;
    }

    .devices-table-wrap.panel-open {
      overflow-x: hidden;
    }

    .devices-table {
      min-width: 440px;
    }

    .devices-table th,
    .devices-table td {
      padding: 0 10px;
    }

    .devices-table .col-version,
    .devices-table .col-model {
      display: none;
    }

    .devices-table .col-state {
      width: 14px;
      padding-right: 0;
    }

    .devices-table .col-type {
      width: 46px;
    }

    .devices-table .col-name {
      width: 140px;
    }

    .devices-table .col-status {
      width: 120px;
    }

    .devices-table .col-ip {
      width: 120px;
    }
  }

  @media (max-width: 520px) {
    .devices-table {
      min-width: 340px;
    }

    .devices-table .col-type {
      width: 36px;
    }

    .devices-table .col-name {
      width: 110px;
    }

    .devices-table .col-status {
      width: 100px;
    }

    .devices-table .col-ip {
      width: 100px;
    }
  }
</style>
