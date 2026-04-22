<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Form from "$lib/client/components/Form.svelte";
  import Input from "$lib/client/components/Input.svelte";
  import SidePanel from "$lib/client/components/SidePanel.svelte";
  import DevicePortLayout from "$lib/client/components/DevicePortLayout.svelte";
  import {
    discoveredDevices,
    initializeDiscoveryDeviceSnapshot,
  } from "$lib/client/stores/discovery-updates";
  import { setDevicesState, setLoading } from "$lib/client/stores/devices";
  import {
    formatJobStatus,
    getCurrentStep,
    getJobsForDevice,
    isRunningJob,
    jobsState,
  } from "$lib/client/stores/jobs";

  let { data, form } = $props();
  const basePath = $derived(`/manage/${data.site.id}`);
  const adoptionPanelOpen = $derived(
    data.adoptionPanel.open ||
      (form?.action === "adopt" && Boolean(form?.message)),
  );
  const panelHost = $derived(form?.host ?? data.adoptionPanel.host);
  const panelProvider = $derived(form?.provider ?? data.adoptionPanel.provider);
  const panelPlatform = $derived(form?.platform ?? data.adoptionPanel.platform);
  const panelApiPort = $derived(
    form?.apiPort ?? (panelPlatform === "switchos" ? 80 : 8728),
  );
  const panelSiteName = $derived(form?.siteName ?? data.adoptionPanel.siteName);
  const panelDiscovery = $derived({
    identity: form?.discoveryIdentity ?? data.adoptionPanel.discovery.identity,
    macAddress: form?.discoveryMacAddress ?? data.adoptionPanel.discovery.macAddress,
    version: form?.discoveryVersion ?? data.adoptionPanel.discovery.version,
    hardware: form?.discoveryHardware ?? data.adoptionPanel.discovery.hardware,
    interfaceName:
      form?.discoveryInterfaceName ?? data.adoptionPanel.discovery.interfaceName,
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
    setLoading(true);
    initializeDiscoveryDeviceSnapshot(data.discoveredDevices);
    
    const devices = data.devices.map((device) => ({
      id: device.id,
      type: (device.platform === "switchos" ? "switch" : "router") as "router" | "switch",
      name: device.identity ?? device.name,
      application: "Network",
      status: device.connectionStatus,
      macAddress: "",
      model: device.model ?? "",
      version: device.routerOsVersion ?? "",
      ipAddress: device.host,
      uplink: "",
      parentDevice: "",
      platform: device.platform,
      adopted: true,
      adoptionMode: device.adoptionMode,
      adoptionState: device.adoptionState,
      image: data.deviceImages[device.id],
      interfaces: data.deviceInterfaces[device.id] ?? [],
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
    $discoveredDevices.length
      ? $discoveredDevices
      : data.discoveredDevices,
  );
  const discoveredRows = $derived(
    runtimeDiscoveredDevices
      .filter((device) => device.address && !adoptedHosts.has(device.address))
      .map((device) => ({
        id: device.id,
        type: "router",
        name: device.identity ?? "Discovered MikroTik",
        application: "Network",
        status: "Discovered",
        macAddress: device.macAddress ?? "",
        model: device.hardware ?? device.platform ?? "",
        version: device.version ?? "",
        ipAddress: device.address ?? "",
        uplink: device.interfaceName ?? "",
        parentDevice: "",
        platform: device.platform ?? "routeros",
        adopted: false,
        adoptionMode: "read_only",
        adoptionState: "discovered",
        image: data.deviceImages[device.id],
        interfaces: [],
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
      application: "Network",
      status: device.connectionStatus,
      macAddress: "",
      model: device.model ?? "",
      version: device.routerOsVersion ?? "",
      ipAddress: device.host,
      uplink: "",
      parentDevice: "",
      platform: device.platform,
      adopted: true,
      adoptionMode: device.adoptionMode,
      adoptionState: device.adoptionState,
      image: data.deviceImages[device.id],
      interfaces: data.deviceInterfaces[device.id] ?? [],
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
      provider: "real",
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
    <table class="devices-table">
      <thead>
        <tr>
          <th class="col-state" style="width: 10px;"></th>
          <th class="col-type" style="width: 64px;">Type</th>
          <th class="col-name">Name</th>
          <th class="col-application">Application</th>
          <th class="col-status">Status</th>
          <th class="col-ip">IP Address</th>
          <th class="col-uplink">Uplink</th>
          <th class="col-parent">Parent Device</th>
          <th class="col-version">RouterOS</th>
          <th class="col-model">Model</th>
          <th class="col-mac">MAC Address</th>
        </tr>
      </thead>
      <tbody>
        {#if rows.length}
          {#each rows as device}
            <tr
              class="device-row"
              class:selected={device.id === selectedDeviceId}
              role="button"
              tabindex="0"
              aria-label={`Open ${device.name} details`}
              onclick={(event) => openDevice(event, device.id)}
              onkeydown={(event) => openDeviceFromKeyboard(event, device.id)}
            >
              <td class="col-state">
                <span class:adopted={device.adopted} class="device-dot"></span>
              </td>
              <td class="col-type">
                <span class="device-type">
                  <img src={device.image.src} alt="" width="28" height="28" />
                </span>
              </td>
              <td class="col-name">{device.name}</td>
              <td class="col-application">{device.application}</td>
              <td class="col-status">
                {#if device.adopted}
                  <span class="status-text">{device.status}</span>
                {:else}
                  <a
                    class="status-action"
                    href={adoptHref(device)}
                  >
                    Click to Adopt
                  </a>
                {/if}
              </td>
              <td class="col-ip">{device.ipAddress}</td>
              <td class="col-uplink">{device.uplink}</td>
              <td class="col-parent">{device.parentDevice}</td>
              <td class="col-version">{device.version}</td>
              <td class="col-model">{device.model}</td>
              <td class="col-mac">{device.macAddress}</td>
            </tr>
          {/each}
        {:else}
          <tr>
            <td colspan="11">
              <div class="empty-devices">
                <div>
                  <div class="empty-devices-icon">
                    <svg
                      viewBox="0 0 24 24"
                      width="48"
                      height="48"
                      aria-hidden="true"
                    >
                      <path
                        fill="currentColor"
                        d="M4 6h11v8H4V6Zm2 2v4h7V8H6Zm11 1h3v7h-3V9ZM3 17h18v2H3v-2Z"
                      />
                    </svg>
                  </div>
                  <strong>No MikroTik Devices Have Been Adopted</strong>
                  <p>
                    If devices are missing, make sure they are online and
                    reachable from the controller.
                  </p>
                </div>
              </div>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
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
          <label class="field">
            <span>Provider</span>
            <select name="provider">
              <option value="real" selected={panelProvider !== "mock"}
                >Real RouterOS API</option
              >
              <option value="mock" selected={panelProvider === "mock"}
                >Mock device</option
              >
            </select>
          </label>
        </div>
      </details>

      <button class="adopt-submit" type="submit">Adopt</button>
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
          <button class="secondary-submit" type="submit">
            Prepare Bootstrap Task
          </button>
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
        <div class="details-tabs" aria-label="Device sections">
          <span class="active">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M7 3h2v18H7V3Zm8 0h2v18h-2V3ZM3 8h2v8H3V8Zm16 0h2v8h-2V8Z"
              />
            </svg>
            Overview
          </span>
          <span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="M5 19h14v2H5v-2Zm1-8h3v6H6v-6Zm5-8h3v14h-3V3Zm5 5h3v9h-3V8Z"
              />
            </svg>
            Insights
          </span>
          <span>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path
                fill="currentColor"
                d="m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.5-2.4 1a8.8 8.8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8.8 8.8 0 0 0 7 6L4.6 5 2.6 8.5l2 1.5-.1 1.5.1 1.5-2 1.5 2 3.5 2.4-1a8.8 8.8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8.8 8.8 0 0 0 17 18l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z"
              />
            </svg>
            Settings
          </span>
        </div>

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
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path fill="currentColor" d="M5 5h7v2H7v10h10v-5h2v7H5V5Zm9 0h5v5h-2V8.4l-6.3 6.3-1.4-1.4L15.6 7H14V5Z" />
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
                  <span class:active={isRunningJob(job)}>{formatJobStatus(job.status)}</span>
                </div>
                <div class="task-progress" aria-label={`${job.progress}% complete`}>
                  <span style={`width: ${job.progress}%`}></span>
                </div>
                <div class="task-meta">
                  <span>{currentStep?.name ?? "No steps"}</span>
                  <span>{job.progress}%</span>
                </div>
              </a>
            {/each}
            {#if selectedDeviceRunningJobs.length}
              <p class="muted">{selectedDeviceRunningJobs.length} task{selectedDeviceRunningJobs.length === 1 ? "" : "s"} running now.</p>
            {/if}
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
                  <a class="message-link" href={`${basePath}/jobs?job=${form.jobId}`}
                    >View task</a
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
              <button class="adopt-submit" type="submit">
                Provision
              </button>
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
              <button class="remove-submit" type="submit">
                Reset & Remove
              </button>
            </form>
          </div>
        {/if}

        {#if selectedDevice.adopted}
          <div class="details-card">
            <div class="card-heading">
              <strong>Interfaces</strong>
              <span>{selectedDevice.interfaces.length}</span>
            </div>
            <DevicePortLayout model={selectedDevice.model || selectedDevice.name} interfaces={selectedDevice.interfaces} variant="compact" />
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

  .device-row {
    cursor: pointer;
    outline: 0;
  }

  .device-row:hover,
  .device-row:focus-visible,
  .device-row.selected {
    background: #fbfdff;
  }

  .device-row:focus-visible td {
    box-shadow: inset 0 0 0 2px rgba(0, 100, 255, 0.16);
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
    background: #e5a13a;
  }

  .device-dot.adopted {
    background: #36b36a;
  }

  .empty-devices {
    display: grid;
    place-items: center;
    min-height: 360px;
    color: #656c72;
    text-align: center;
  }

  .empty-devices-icon {
    display: grid;
    place-items: center;
    width: 50px;
    height: 42px;
    margin: 0 auto 12px;
    color: #c8dff7;
  }

  .empty-devices strong {
    display: block;
    margin-bottom: 8px;
    color: #50575d;
  }

  .empty-devices p {
    max-width: 380px;
    margin: 0;
    line-height: 1.5;
  }

  .status-text {
    color: #323a40;
  }

  .status-action {
    color: var(--color-link);
    font-weight: 500;
  }

  .status-action:hover {
    text-decoration: underline;
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
  }

  .details-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    overflow: hidden;
    border-radius: 6px;
    background: #fbfdff;
  }

  .details-tabs span {
    display: grid;
    place-items: center;
    gap: 5px;
    min-height: 58px;
    color: #717b84;
    font-size: 12px;
  }

  .details-tabs .active {
    color: var(--color-link);
    background: var(--color-surface);
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
      min-width: 560px;
    }

    .devices-table th,
    .devices-table td {
      padding: 0 10px;
    }

    .devices-table .col-application,
    .devices-table .col-uplink,
    .devices-table .col-parent,
    .devices-table .col-version,
    .devices-table .col-model,
    .devices-table .col-mac {
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
      min-width: 500px;
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
      width: 112px;
    }

    .devices-table .col-ip {
      width: 120px;
    }
  }
</style>
