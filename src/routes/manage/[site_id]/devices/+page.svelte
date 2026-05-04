<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Form from "$lib/client/components/primitives/Form.svelte";
  import Input from "$lib/client/components/primitives/Input.svelte";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import TableSkeleton from "$lib/client/components/primitives/TableSkeleton.svelte";
  import EmptyState from "$lib/client/components/primitives/EmptyState.svelte";
  import StatusBadge from "$lib/client/components/primitives/StatusBadge.svelte";
  import SidePanel from "$lib/client/components/layout/SidePanel.svelte";
  import DevicePortLayout from "$lib/client/components/ui/DevicePortLayout.svelte";
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

    const devices = data.devices.map((device) => ({
      id: device.id,
      type: (device.platform === "switchos" ? "switch" : "router") as
        | "router"
        | "switch",
      name: device.identity ?? device.name,
      status: device.connectionStatus,
      model: device.model ?? "",
      version: device.routerOsVersion ?? "",
      ipAddress: device.host,
      platform: device.platform,
      adopted: true,
      adoptionMode: device.adoptionMode,
      adoptionState: device.adoptionState,
      image: data.deviceImages[device.id],
      interfaces: data.deviceInterfaces[device.id] ?? [],
      macAddress: "",
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
    }));

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
    data.devices.map((device) => ({
      id: device.id,
      type: device.platform === "switchos" ? "switch" : "router",
      name: device.identity ?? device.name,
      status: device.connectionStatus,
      model: device.model ?? "",
      version: device.routerOsVersion ?? "",
      ipAddress: device.host,
      platform: device.platform,
      adopted: true,
      adoptionMode: device.adoptionMode,
      adoptionState: device.adoptionState,
      image: data.deviceImages[device.id],
      interfaces: data.deviceInterfaces[device.id] ?? [],
      macAddress: "",
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
    })),
  );

  const rows = $derived([...adoptedRows, ...discoveredRows]);
  const adoptedCount = $derived(adoptedRows.length);
  const discoveredCount = $derived(discoveredRows.length);
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
        } else if (event.type === "device.updated" && event.payload.connectionStatus) {
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

<section class="devices-page" class:with-panel={anyPanelOpen}>
  <div class="devices-toolbar">
    <div class="toolbar-left">
      <input
        class="search-input"
        type="search"
        placeholder="Search"
        aria-label="Search devices"
      />
      <div class="tabs" aria-label="Device filters">
        <a href={`${basePath}/devices`} aria-current="page"
          >All ({rows.length})</a
        >
        <a href={`${basePath}/devices`}>WiFi (0)</a>
        <a href={`${basePath}/devices`}>Wired ({rows.length})</a>
        <a href={`${basePath}/devices`}>Adopted ({adoptedCount})</a>
        <a href={`${basePath}/devices`}>Discovered ({discoveredCount})</a>
      </div>
    </div>

    <a
      class="icon-button"
      href={`${basePath}/devices?adopt=`}
      aria-label="Adopt device"
      title="Adopt device"
    >
      <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
        <path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" />
      </svg>
    </a>
  </div>

  <div class="devices-table-wrap">
    {#if $devicesState.loading}
      <TableSkeleton columns={7} rows={6} />
    {:else if rows.length}
      <table class="devices-table">
        <thead>
          <tr>
            <th class="col-state" style="width: 10px;"></th>
            <th class="col-type" style="width: 64px;">Type</th>
            <th class="col-name">Name</th>
            <th class="col-status">Status</th>
            <th class="col-ip">IP Address</th>
            <th class="col-version">RouterOS</th>
            <th class="col-model">Model</th>
          </tr>
        </thead>
        <tbody>
          {#if adoptedRows.length}
            <tr class="section-header">
              <td colspan="7">Adopted ({adoptedRows.length})</td>
            </tr>
          {/if}
          {#each adoptedRows as device}
            <tr
              class="device-row device-row--adopted"
              class:selected={device.id === selectedDeviceId}
              role="button"
              tabindex="0"
              aria-label={`Open ${device.name} details`}
              onclick={(event) => openDevice(event, device.id)}
              onkeydown={(event) => openDeviceFromKeyboard(event, device.id)}
            >
              <td class="col-state">
                <span class:adopted={true} class="device-dot"></span>
              </td>
              <td class="col-type">
                <span class="device-type">
                  <img src={device.image.src} alt="" width="28" height="28" />
                </span>
              </td>
              <td class="col-name">{device.name}</td>
              <td class="col-status">
                <StatusBadge status={normalizeStatus(device.status)} />
              </td>
              <td class="col-ip">{device.ipAddress}</td>
              <td class="col-version">
                <span class="version-cell">
                  {device.version || "—"}
                  {#if "firmware" in device && (device as any).firmware?.updateAvailable}
                    <span class="fw-badge">Update</span>
                  {/if}
                </span>
              </td>
              <td class="col-model">{device.model}</td>
            </tr>
          {/each}
          {#if discoveredRows.length}
            <tr class="section-header">
              <td colspan="7">Discovered ({discoveredRows.length})</td>
            </tr>
          {/if}
          {#each discoveredRows as device}
            <tr
              class="device-row device-row--discovered"
              class:selected={device.id === selectedDeviceId}
              role="button"
              tabindex="0"
              aria-label={`Adopt ${device.name}`}
              onclick={(event) => openDevice(event, device.id)}
              onkeydown={(event) => openDeviceFromKeyboard(event, device.id)}
            >
              <td class="col-state">
                <span class="device-dot"></span>
              </td>
              <td class="col-type">
                <span class="device-type">
                  <img src={device.image.src} alt="" width="28" height="28" />
                </span>
              </td>
              <td class="col-name">{device.name}</td>
              <td class="col-status">
                <a class="adopt-action" href={adoptHref(device)}>
                  <StatusBadge status="discovered" />
                </a>
              </td>
              <td class="col-ip">{device.ipAddress}</td>
              <td class="col-version">
                <span class="version-cell">{device.version || "—"}</span>
              </td>
              <td class="col-model">{device.model}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <EmptyState
        icon="M4 6h11v8H4V6Zm2 2v4h7V8H6Zm11 1h3v7h-3V9ZM3 17h18v2H3v-2Z"
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
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M5 5h7v2H7v10h10v-5h2v7H5V5Zm9 0h5v5h-2V8.4l-6.3 6.3-1.4-1.4L15.6 7H14V5Z"
                />
              </svg>
              Open full page
            </a>
          {/if}
        </div>

        <div class="details-card">
          <div class="info-row">
            <span>Device Version</span>
            <strong>{selectedDevice.version || "-"}</strong>
          </div>
          <div class="info-row">
            <span>IP Address</span>
            <strong>{selectedDevice.ipAddress || "-"}</strong>
          </div>
          <div class="info-row">
            <span>Status</span>
            <strong
              >{selectedDevice.adopted
                ? selectedDevice.status
                : "Discovered"}</strong
            >
          </div>
          <div class="info-row">
            <span>MAC Address</span>
            <strong>{selectedDevice.macAddress || "-"}</strong>
          </div>
          <div class="info-row">
            <span>Model</span>
            <strong>{selectedDevice.model || "-"}</strong>
          </div>
          {#if selectedDevice.adopted}
            <div class="info-row">
              <span>Serial Number</span>
              <strong>{selectedDevice.details.serialNumber || "-"}</strong>
            </div>
            <div class="info-row">
              <span>Architecture</span>
              <strong>{selectedDevice.details.architecture || "-"}</strong>
            </div>
            <div class="info-row">
              <span>Uptime</span>
              <strong
                >{formatUptime(selectedDevice.details.uptimeSeconds)}</strong
              >
            </div>
            <div class="info-row">
              <span>Last Sync</span>
              <strong>{formatDate(selectedDevice.details.lastSyncAt)}</strong>
            </div>
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

        {#if selectedDevice.adopted && selectedDevice.platform === "routeros"}
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
            <div class="info-row">
              <span>Installed</span>
              <strong
                >{(fw?.currentVersion ?? selectedDevice.version) || "—"}</strong
              >
            </div>
            {#if fw?.latestVersion}
              <div class="info-row">
                <span>Latest ({fw.channel})</span>
                <strong class:fw-outdated={fw.updateAvailable}
                  >{fw.latestVersion}</strong
                >
              </div>
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

        {#if selectedDevice.adopted && !selectedDeviceProvisioned}
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

        {#if selectedDevice.adopted}
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
        {:else}
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
</section>

<style lang="scss">
  .devices-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .devices-page.with-panel {
    padding-right: min(390px, 28vw);
  }

  .devices-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input {
    width: min(260px, 100%);
    height: 32px;
    border: 1px solid #eef1f3;
    border-radius: 3px;
    padding: 0 12px;
    color: #36434a;
    background: #f8f9fa;
  }

  .tabs {
    display: inline-flex;
    height: 32px;
    border: 1px solid #edf0f2;
    border-radius: 4px;
    overflow: hidden;
    background: var(--color-surface);
  }

  .tabs a {
    display: inline-flex;
    align-items: center;
    padding: 0 11px;
    color: #7d8790;
    font-size: 13px;
    border-right: 1px solid #edf0f2;
  }

  .tabs a:last-child {
    border-right: 0;
  }

  .tabs a[aria-current="page"] {
    color: var(--color-link);
    background: #fbfdff;
  }

  .icon-button {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 4px;
    color: #8f9aa3;
    background: transparent;
    cursor: pointer;
  }

  .icon-button:hover {
    border-color: #dce4e9;
    background: var(--color-surface);
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

  .section-header td {
    height: 28px;
    padding-top: 4px;
    padding-bottom: 4px;
    border-bottom: 0;
    color: var(--color-muted, #686c6b);
    font-size: 11px;
    font-weight: 750;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--color-page, #f3f4f4);
  }

  .device-row {
    cursor: pointer;
    outline: 0;
  }

  .device-row:focus-visible td {
    box-shadow: inset 0 0 0 2px rgba(0, 100, 255, 0.16);
  }

  .device-row--adopted:hover,
  .device-row--adopted.selected {
    background: #fbfdff;
  }

  .device-row--discovered {
    background: var(--color-warning-light, #fef3c7);
  }

  .device-row--discovered:hover,
  .device-row--discovered.selected {
    background: color-mix(
      in srgb,
      var(--color-warning-light, #fef3c7) 80%,
      #fff
    );
  }

  .adopt-action {
    color: inherit;
    text-decoration: none;

    &:hover {
      opacity: 0.8;
    }
  }

  .adopt-link {
    text-decoration: none;
  }

  .device-type {
    display: inline-grid;
    grid-template-columns: 8px 32px;
    align-items: center;
    gap: 6px;
    color: #9aa3aa;
  }

  .device-type img {
    width: 28px;
    height: 28px;
    object-fit: contain;
  }

  .device-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--color-warning, #f59e0b);
  }

  .device-dot.adopted {
    background: var(--color-success, #16a34a);
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

  .secondary-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    border: 1px solid #dce4e9;
    border-radius: 6px;
    padding: 0 14px;
    color: #30373d;
    background: var(--color-surface);
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

  .remove-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    border: 1px solid var(--color-danger);
    border-radius: 6px;
    padding: 0 14px;
    color: var(--color-surface);
    background: var(--color-danger);
    font-weight: 750;
    cursor: pointer;
  }

  .remove-submit:hover {
    filter: brightness(0.96);
  }

  .upgrade-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 36px;
    border: none;
    border-radius: 5px;
    padding: 0 14px;
    color: #fff;
    background: var(--color-warning, #d97706);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;

    &:hover {
      filter: brightness(1.08);
    }
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

  .fw-badge {
    display: inline-flex;
    align-items: center;
    height: 18px;
    border-radius: 999px;
    padding: 0 7px;
    color: #fff;
    background: var(--color-warning, #d97706);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .fw-outdated {
    color: var(--color-warning, #d97706);
    font-weight: 700;
  }

  .card-meta {
    color: #8a949c;
    font-size: 11px;
    font-weight: 400;
  }

  .info-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: 16px;
    align-items: baseline;
    color: #3f484f;
    font-size: 14px;
  }

  .info-row strong {
    min-width: 0;
    color: #7c858d;
    font-weight: 500;
    text-align: right;
    overflow-wrap: anywhere;
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
    .devices-page.with-panel {
      padding-right: 0;
    }

    .devices-toolbar,
    .toolbar-left {
      align-items: flex-start;
      flex-direction: column;
    }

    .devices-table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .devices-table {
      min-width: 480px;
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
      width: 50px;
    }

    .devices-table .col-name {
      width: 140px;
    }

    .devices-table .col-status {
      width: 116px;
    }

    .devices-table .col-ip {
      width: 130px;
    }
  }

  @media (max-width: 520px) {
    .devices-table {
      min-width: 380px;
    }

    .devices-table .col-type {
      width: 42px;
    }

    .device-type img {
      width: 24px;
      height: 24px;
    }

    .devices-table .col-name {
      width: 118px;
    }

    .devices-table .col-status {
      width: 100px;
    }

    .devices-table .col-ip {
      width: 110px;
    }
  }
</style>
