<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import {
    formatJobStatus,
    getCurrentStep,
    isRunningJob,
    jobsState,
    setJobsSnapshot,
  } from "$lib/client/stores/jobs";
  import { enhance } from "$app/forms";
  import Button from "$lib/client/components/primitives/Button.svelte";
  import Icon from "$lib/client/components/primitives/Icon.svelte";
  import {PageHeader} from "$lib/client/components/layout/Page";
  import { Page } from "$lib/client/components/layout";
  import DevicePortLayout from "$lib/client/components/ui/DevicePortLayout.svelte";
  import TabLayout from "$lib/client/components/layout/TabLayout.svelte";
  import TrafficSparkline from "$lib/client/components/ui/TrafficSparkline.svelte";
  import type { JobStatus } from "$lib/shared/action-events";
  import type { IconName } from "$lib/client/components/primitives/icons";

  type DeviceTab =
    | "overview"
    | "firewall"
    | "vlans"
    | "activity"
    | "backups"
    | "advanced";
  type TabItem<T extends string = string> = {
    id: T;
    label: string;
    icon?: IconName;
  };

  let { data, form } = $props();

  const basePath = $derived(`/manage/${data.site.id}`);
  const device = $derived(data.device);
  const deviceName = $derived(device.name ?? device.identity);
  const capabilities = $derived(device.capabilities ?? []);
  const tags = $derived(device.tags ?? []);
  const deviceJobs = $derived(
    $jobsState.jobs.filter((job) => job.deviceId === device.id),
  );
  const runningJobs = $derived(deviceJobs.filter((job) => isRunningJob(job)));
  const provisioned = $derived(
    device.adoptionState === "fully_managed" ||
      device.adoptionMode === "managed",
  );
  const tabs: TabItem<DeviceTab>[] = [
    { id: "overview", label: "Overview", icon: "bar-chart" },
    { id: "activity", label: "Activity", icon: "activity" },
    { id: "firewall", label: "Firewall", icon: "shield" },
    { id: "vlans", label: "VLANs", icon: "lines" },
    { id: "backups", label: "Backups", icon: "backup" },
    { id: "advanced", label: "Advanced", icon: "gear" },
  ];
  const validTabIds = new Set<DeviceTab>(tabs.map((tab) => tab.id));
  const activeTab = $derived(
    validTabIds.has(page.url.searchParams.get("tab") as DeviceTab)
      ? (page.url.searchParams.get("tab") as DeviceTab)
      : "overview",
  );

  onMount(() => {
    setJobsSnapshot(data.jobs);
  });

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

  function formatLabel(value: string | null | undefined) {
    if (!value) {
      return "-";
    }

    return value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getJobStatusTone(status: JobStatus) {
    switch (status) {
      case "succeeded":
        return "success";
      case "failed":
      case "revert_failed":
        return "danger";
      case "rolling_back":
      case "needs_attention":
        return "warning";
      case "running":
        return "running";
      case "cancelled":
      case "reverted":
        return "muted";
      case "queued":
      default:
        return "queued";
    }
  }

  const canReset = $derived(
    device.adoptionMode === "managed" && device.connectionStatus === "online",
  );
  const statusKnownOffline = $derived(
    device.connectionStatus === "offline" ||
      device.connectionStatus === "auth_failed" ||
      device.connectionStatus === "blocked",
  );

  function confirmRemove(event: SubmitEvent) {
    let suffix: string;
    if (canReset) {
      suffix = " This will erase the device configuration and reboot it.";
    } else if (statusKnownOffline) {
      suffix = " The device is offline — it will not be factory reset.";
    } else if (device.connectionStatus === "unknown") {
      suffix =
        " Device status is unknown — it will only be removed from the controller.";
    } else {
      suffix = " The device is not fully managed — it will only be removed from the controller.";
    }

    if (!confirm(`${canReset ? "Factory reset" : "Remove"} ${deviceName} from the controller?${suffix}`)) {
      event.preventDefault();
    }
  }

  function tabHref(tabId: DeviceTab) {
    const params = new URLSearchParams(page.url.searchParams);
    params.set("tab", tabId);
    return `${page.url.pathname}?${params.toString()}`;
  }

  function openTerminalWindow() {
    const width = Math.min(1280, Math.max(960, window.screen.availWidth - 160));
    const height = Math.min(
      860,
      Math.max(640, window.screen.availHeight - 140),
    );
    const left = Math.max(
      0,
      Math.round((window.screen.availWidth - width) / 2),
    );
    const top = Math.max(
      0,
      Math.round((window.screen.availHeight - height) / 2),
    );
    const features = [
      "popup=yes",
      "resizable=yes",
      "scrollbars=yes",
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`,
    ].join(",");
    const terminalWindow = window.open(
      `${page.url.pathname}/terminal`,
      `terminal-${device.id}`,
      features,
    );

    if (terminalWindow) {
      terminalWindow.focus();
      return;
    }

    window.location.href = `${page.url.pathname}/terminal`;
  }
</script>

<Page>
  <div class="device-page-header">
    <a
      class="back-link"
      href={`${basePath}/devices`}
      aria-label="Back to devices"
    >
      <Icon name="arrow-left" size={18} />
    </a>
    <PageHeader
      title={deviceName}
      subtitle={device.model || "MikroTik device"}
    />
  </div>

  <div class="device-hero">
    <div class="hero-product">
      <img src={data.deviceImage.src} alt="" width="132" height="92" />
      <div>
        <span class={`status-pill status-${device.connectionStatus}`}
          >{formatLabel(device.connectionStatus)}</span
        >
        <div class="device-name-row">
          <form
            method="POST"
            action="?/rename"
            use:enhance={() =>
              async ({ update }) => {
                await update();
              }}
            class="rename-form"
          >
            <input
              type="text"
              name="name"
              value={device.name}
              maxlength="120"
              class="rename-input"
              placeholder="Device name"
            />
            {#if provisioned}
              <label class="rename-checkbox">
                <input type="checkbox" name="manageIdentity" value="on" />
                <span>Also update MikroTik identity</span>
              </label>
            {/if}
            <Button type="submit" size="sm" variant="ghost">Rename</Button>
          </form>
        </div>
        <p>{device.host}:{device.apiPort}</p>
      </div>
    </div>
    <div class="hero-facts" aria-label="Device summary">
      <div>
        <span>RouterOS</span>
        <strong>{device.routerOsVersion || "-"}</strong>
      </div>
      <div>
        <span>Last sync</span>
        <strong>{formatDate(device.lastSyncAt)}</strong>
      </div>
      <div>
        <span>Mode</span>
        <strong>{formatLabel(device.adoptionMode)}</strong>
      </div>
      <div>
        <span>Running jobs</span>
        <strong>{runningJobs.length}</strong>
      </div>
    </div>
    <div class="hero-actions">
      {#if !provisioned && device.connectionStatus === 'online'}
        <form method="POST" action="?/provision">
          <input type="hidden" name="deviceId" value={device.id} />
          <Button type="submit">Provision</Button>
        </form>
      {/if}
      <a class="secondary-action" href={`${basePath}/jobs`}>Jobs</a>
    </div>
  </div>

  {#if form?.message}
    <div class={form?.success ? "message-success" : "error-message"}>
      {form.message}
      {#if form?.jobId}
        <a class="message-link" href={`${basePath}/jobs?job=${form.jobId}`}
          >View task</a
        >
      {/if}
    </div>
  {/if}

  <TabLayout {tabs} {activeTab} getHref={tabHref} ariaLabel="Device sections">
    {#if activeTab === "overview"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Overview</h2>
          <span>{formatLabel(device.adoptionState)}</span>
        </div>
        <div class="info-grid">
          <div class="info-row">
            <span>Platform</span>
            <strong>{formatLabel(device.platform)}</strong>
          </div>
          <div class="info-row">
            <span>Serial Number</span>
            <strong>{device.serialNumber || "-"}</strong>
          </div>
          <div class="info-row">
            <span>Architecture</span>
            <strong>{device.architecture || "-"}</strong>
          </div>
          {#if device.connectionStatus === 'online'}
            <div class="info-row">
              <span>Uptime</span>
              <strong>{formatUptime(device.uptimeSeconds)}</strong>
            </div>
          {/if}
          <div class="info-row">
            <span>Last Seen</span>
            <strong>{formatDate(device.lastSeenAt)}</strong>
          </div>
          <div class="info-row">
            <span>SSH Port</span>
            <strong>{device.sshPort}</strong>
          </div>
        </div>
        <div class="token-groups">
          <div>
            <strong>Capabilities</strong>
            {#if capabilities.length}
              <div class="tokens">
                {#each capabilities as capability}
                  <span>{capability}</span>
                {/each}
              </div>
            {:else}
              <p class="muted">No capabilities collected yet.</p>
            {/if}
          </div>
          <div>
            <strong>Tags</strong>
            {#if tags.length}
              <div class="tokens">
                {#each tags as tag}
                  <span>{tag}</span>
                {/each}
              </div>
            {:else}
              <p class="muted">No tags assigned.</p>
            {/if}
          </div>
        </div>
      </section>

      <section class="content-section">
        <div class="section-heading">
          <h2>Interfaces</h2>
          <span>{data.interfaces.length}</span>
        </div>
        {#if device.connectionStatus === 'online'}
          <DevicePortLayout
            model={device.model ?? deviceName}
            interfaces={data.interfaces}
            variant="full"
          />
        {/if}
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                {#if device.connectionStatus === 'online'}<th>State</th>{/if}
                <th>Type</th>
                <th>MAC Address</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {#if data.interfaces.length}
                {#each data.interfaces as networkInterface}
                  <tr>
                    <td>{networkInterface.name}</td>
                    {#if device.connectionStatus === 'online'}
                      <td>
                        <span
                          class:online={networkInterface.running}
                          class="interface-state"
                        >
                          {networkInterface.disabled
                            ? "Disabled"
                            : networkInterface.running
                              ? "Running"
                              : "Inactive"}
                        </span>
                      </td>
                    {/if}
                    <td>{networkInterface.type || "-"}</td>
                    <td>{networkInterface.macAddress || "-"}</td>
                    <td>{networkInterface.comment || "-"}</td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan={device.connectionStatus === 'online' ? 5 : 4}>
                    <div class="empty-state">No interfaces collected yet.</div>
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      {#if device.connectionStatus === 'online' && Object.keys(data.ifaceTraffic).length > 0}
        <section class="content-section">
          <div class="section-heading">
            <h2>Traffic</h2>
            <span
              >Last hour · <span class="legend-rx-label">↓ RX</span>
              <span class="legend-tx-label">↑ TX</span></span
            >
          </div>
          <div class="traffic-grid">
            {#each Object.entries(data.ifaceTraffic) as [name, samples]}
              <div class="traffic-card">
                <div class="traffic-card-name">{name}</div>
                <TrafficSparkline {samples} width={180} height={44} />
              </div>
            {/each}
          </div>
        </section>
      {/if}
      {#if device.connectionStatus === 'online' && data.device.platform === "routeros"}
        <section class="content-section">
          <div class="section-heading">
            <h2>Firmware</h2>
            {#if data.firmware?.checkedAt}
              <span>Checked {formatDate(data.firmware.checkedAt)}</span>
            {:else}
              <span>Not checked yet</span>
            {/if}
          </div>
          <div class="info-grid">
            <div class="info-row">
              <span>Installed version</span>
              <strong
                >{data.firmware?.currentVersion ??
                  data.device.routerOsVersion ??
                  "—"}</strong
              >
            </div>
            <div class="info-row">
              <span>Latest ({data.firmware?.channel ?? "stable"})</span>
              <strong>{data.firmware?.latestVersion ?? "—"}</strong>
            </div>
            <div class="info-row">
              <span>Status</span>
              <strong>
                {#if !data.firmware}
                  <span class="status-pill">Unknown</span>
                {:else if data.firmware.updateAvailable}
                  <span class="status-pill status-warning"
                    >Update available</span
                  >
                {:else}
                  <span class="status-pill status-success">Up to date</span>
                {/if}
              </strong>
            </div>
          </div>
          <div class="fw-detail-actions">
            <form method="POST" action="?/firmwareCheck" use:enhance>
              <Button type="submit" size="sm" variant="ghost"
                >Check for updates</Button
              >
            </form>
            {#if data.firmware?.updateAvailable}
              <form method="POST" action="?/firmwareUpgrade" use:enhance>
                <Button
                  type="submit"
                  size="sm"
                  variant="warning"
                  onclick={(e) => {
                    if (
                      !confirm(
                        `Upgrade to ${data.firmware?.latestVersion}? Device will reboot.`,
                      )
                    )
                      e.preventDefault();
                  }}
                >
                  Upgrade to {data.firmware.latestVersion}
                </Button>
              </form>
            {/if}
          </div>
        </section>
      {/if}
    {:else if activeTab === "firewall"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Firewall Rules</h2>
          <span>{data.firewallRules.length} rules</span>
        </div>
        {#if data.firewallRules.length === 0}
          <div class="empty-state">
            No firewall rules collected yet. Rules sync during the next
            monitoring tick.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Chain</th>
                  <th>Action</th>
                  <th>Src</th>
                  <th>Dst</th>
                  <th>Protocol</th>
                  <th>Comment</th>
                  <th>State</th>
                  {#if provisioned}<th></th>{/if}
                </tr>
              </thead>
              <tbody>
                {#each data.firewallRules as rule, i}
                  <tr class:disabled-row={rule.disabled}>
                    <td class="mono-cell">{i + 1}</td>
                    <td
                      ><span class="chain-badge chain-{rule.chain}"
                        >{rule.chain}</span
                      ></td
                    >
                    <td
                      ><span class="action-badge action-{rule.action}"
                        >{rule.action}</span
                      ></td
                    >
                    <td class="mono-cell"
                      >{rule.srcAddress || rule.inInterface || "—"}</td
                    >
                    <td class="mono-cell"
                      >{rule.dstAddress || rule.outInterface || "—"}</td
                    >
                    <td>{rule.protocol || "any"}</td>
                    <td class="comment-cell">{rule.comment || "—"}</td>
                    <td>
                      {#if rule.disabled}
                        <span class="status-pill">Disabled</span>
                      {:else}
                        <span class="status-pill status-success">Active</span>
                      {/if}
                    </td>
                    {#if provisioned}
                      <td class="action-cell">
                        {#if rule.routerId}
                          <form
                            method="POST"
                            action="?/deleteFirewallRule"
                            use:enhance
                          >
                            <input
                              type="hidden"
                              name="routerId"
                              value={rule.routerId}
                            />
                            <button
                              type="submit"
                              class="row-delete-btn"
                              onclick={(e) => {
                                if (
                                  !confirm(
                                    "Delete this firewall rule from the device?",
                                  )
                                )
                                  e.preventDefault();
                              }}>✕</button
                            >
                          </form>
                        {/if}
                      </td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        {#if provisioned}
          <div class="add-rule-section">
            <p class="add-rule-label">Add rule</p>
            <form
              method="POST"
              action="?/addFirewallRule"
              use:enhance
              class="add-form"
            >
              <div class="add-form-grid">
                <label class="form-field">
                  <span>Chain *</span>
                  <select name="chain" required>
                    <option value="input">input</option>
                    <option value="forward">forward</option>
                    <option value="output">output</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>Action *</span>
                  <select name="fwAction" required>
                    <option value="accept">accept</option>
                    <option value="drop">drop</option>
                    <option value="reject">reject</option>
                    <option value="log">log</option>
                    <option value="jump">jump</option>
                    <option value="return">return</option>
                    <option value="passthrough">passthrough</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>Src Address</span>
                  <input
                    type="text"
                    name="srcAddress"
                    placeholder="10.0.0.0/8"
                  />
                </label>
                <label class="form-field">
                  <span>Dst Address</span>
                  <input
                    type="text"
                    name="dstAddress"
                    placeholder="192.168.1.0/24"
                  />
                </label>
                <label class="form-field">
                  <span>Protocol</span>
                  <input
                    type="text"
                    name="protocol"
                    placeholder="tcp / udp / icmp"
                  />
                </label>
                <label class="form-field">
                  <span>In Interface</span>
                  <input type="text" name="inInterface" placeholder="ether1" />
                </label>
                <label class="form-field">
                  <span>Src Port</span>
                  <input
                    type="text"
                    name="srcPort"
                    placeholder="80 / 8080-8090"
                  />
                </label>
                <label class="form-field">
                  <span>Dst Port</span>
                  <input type="text" name="dstPort" placeholder="443" />
                </label>
                <label class="form-field form-field-wide">
                  <span>Comment</span>
                  <input
                    type="text"
                    name="comment"
                    placeholder="Optional description"
                  />
                </label>
              </div>
              <Button type="submit" size="sm">Add rule</Button>
            </form>
          </div>
        {:else}
          <p class="muted">Write operations require a fully managed device.</p>
        {/if}
      </section>
    {:else if activeTab === "vlans"}
      <section class="content-section">
        <div class="section-heading">
          <h2>VLANs</h2>
          <span>{data.vlans.length} configured</span>
        </div>
        {#if data.vlans.length === 0}
          <div class="empty-state">
            No VLANs collected yet. VLANs sync during the next monitoring tick.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>VLAN ID</th>
                  <th>Name</th>
                  <th>Interface</th>
                  <th>Comment</th>
                  {#if provisioned}<th></th>{/if}
                </tr>
              </thead>
              <tbody>
                {#each data.vlans as vlan}
                  <tr>
                    <td class="mono-cell">{vlan.vlanId}</td>
                    <td>{vlan.name}</td>
                    <td class="mono-cell">{vlan.interfaceName || "—"}</td>
                    <td class="comment-cell">{vlan.comment || "—"}</td>
                    {#if provisioned}
                      <td class="action-cell">
                        {#if vlan.routerId}
                          <form method="POST" action="?/deleteVlan" use:enhance>
                            <input
                              type="hidden"
                              name="routerId"
                              value={vlan.routerId}
                            />
                            <button
                              type="submit"
                              class="row-delete-btn"
                              onclick={(e) => {
                                if (
                                  !confirm(
                                    `Delete VLAN ${vlan.vlanId} (${vlan.name}) from the device?`,
                                  )
                                )
                                  e.preventDefault();
                              }}>✕</button
                            >
                          </form>
                        {/if}
                      </td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
        {#if provisioned}
          <div class="add-rule-section">
            <p class="add-rule-label">Add VLAN</p>
            <form method="POST" action="?/addVlan" use:enhance class="add-form">
              <div class="add-form-grid">
                <label class="form-field">
                  <span>VLAN ID * (1–4094)</span>
                  <input
                    type="number"
                    name="vlanId"
                    min="1"
                    max="4094"
                    required
                    placeholder="100"
                  />
                </label>
                <label class="form-field">
                  <span>Name *</span>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="vlan-mgmt"
                  />
                </label>
                <label class="form-field">
                  <span>Interface *</span>
                  <input
                    type="text"
                    name="interfaceName"
                    required
                    placeholder="ether1"
                  />
                </label>
                <label class="form-field">
                  <span>Comment</span>
                  <input
                    type="text"
                    name="comment"
                    placeholder="Optional description"
                  />
                </label>
              </div>
              <Button type="submit" size="sm">Add VLAN</Button>
            </form>
          </div>
        {:else}
          <p class="muted">Write operations require a fully managed device.</p>
        {/if}
      </section>
    {:else if activeTab === "activity"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Activity</h2>
          <a href={`${basePath}/jobs`}>View all jobs</a>
        </div>
        {#if deviceJobs.length}
          <div class="job-list">
            {#each deviceJobs as job}
              {@const currentStep = getCurrentStep(job)}
              <a class="job-row" href={`${basePath}/jobs?job=${job.id}`}>
                <div>
                  <strong>{job.type}</strong>
                  <span>{currentStep?.name ?? "No steps"}</span>
                </div>
                <div class="job-progress">
                  <span
                    class={`status-value status-${getJobStatusTone(job.status)}`}
                    >{formatJobStatus(job.status)}</span
                  >
                  <div
                    class="progress-bar"
                    aria-label={`${job.progress}% complete`}
                  >
                    <span style={`width: ${job.progress}%`}></span>
                  </div>
                  <small>{job.progress}%</small>
                </div>
              </a>
            {/each}
          </div>
        {:else}
          <div class="empty-state">No jobs have run for this device yet.</div>
        {/if}
      </section>
    {:else if activeTab === "backups"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Backups</h2>
          <form method="POST" action="?/backup" use:enhance>
            <Button type="submit" size="sm" variant="ghost"
              >+ Run backup now</Button
            >
          </form>
        </div>
        {#if data.backups.length === 0}
          <div class="empty-state">
            No backups yet. Click "Run backup now" to create one.
          </div>
        {:else}
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Kind</th>
                  <th>Size</th>
                  <th>Checksum</th>
                </tr>
              </thead>
              <tbody>
                {#each data.backups as backup}
                  <tr>
                    <td>{formatDate(backup.collectedAt)}</td>
                    <td>{backup.kind}</td>
                    <td
                      >{backup.sizeBytes
                        ? `${(backup.sizeBytes / 1024).toFixed(1)} KB`
                        : "—"}</td
                    >
                    <td class="mono-cell"
                      >{backup.sha256
                        ? backup.sha256.slice(0, 12) + "…"
                        : "—"}</td
                    >
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeTab === "advanced"}
      <section class="content-section">
        <div class="section-heading">
          <h2>Advanced</h2>
          <span>Lifecycle</span>
        </div>
        <div class="advanced-grid">
          <div class="advanced-block">
            <strong>Provisioning</strong>
            <p>
              {provisioned
                ? "This device is fully managed by the controller."
                : "Schedule provisioning to apply the controller-managed baseline."}
            </p>
            {#if !provisioned}
              <form method="POST" action="?/provision">
                <input type="hidden" name="deviceId" value={device.id} />
                <Button type="submit">Provision</Button>
              </form>
            {/if}
          </div>
          <div class="advanced-block">
            <strong>Terminal</strong>
            <p>
              Open an SSH terminal in a separate linked window for this device.
            </p>
            {#if data.terminalAvailable}
              <button
                class="secondary-action terminal-link"
                type="button"
                onclick={openTerminalWindow}
              >
                <Icon name="terminal" size={17} />
                <span>Open terminal</span>
              </button>
            {:else}
              <p class="muted">
                Terminal access is available only to administrators for managed
                RouterOS devices with SSH trust.
              </p>
            {/if}
          </div>
          <div class="advanced-block">
            <strong>Public WAN IP</strong>
            <p>
              Set the public IP address used as the WireGuard endpoint when creating site-to-site VPN tunnels.
              If left blank, the device host address is used instead.
            </p>
            <form method="POST" action="?/setPublicIp" use:enhance class="public-ip-row">
              <input
                type="text"
                name="publicIp"
                placeholder="e.g. 203.0.113.10"
                value={device.publicIp ?? ""}
                class="public-ip-input"
              />
              <Button variant="secondary" size="sm" type="submit">Save</Button>
            </form>
          </div>
          {#if data.sites.length > 1}
            <div class="advanced-block">
              <strong>Move to new site</strong>
              <p>Transfer this device to a different site. You will be redirected there after the move.</p>
              <form method="POST" action="?/moveToSite" use:enhance>
                <div class="migrate-row">
                  <select name="targetSiteId" class="migrate-select" required>
                    <option value="" disabled selected>Select site…</option>
                    {#each data.sites.filter((s) => s.id !== data.site.id) as site}
                      <option value={site.id}>{site.name}</option>
                    {/each}
                  </select>
                  <Button variant="secondary" size="sm" type="submit">Move</Button>
                </div>
              </form>
            </div>
          {/if}
          <div class="advanced-block danger-block">
            <strong>Remove device</strong>
            <p>
              {canReset
                ? "Factory reset the device and remove it from the controller inventory."
                : statusKnownOffline
                  ? "The device is offline. It will be removed from the controller without a factory reset."
                  : device.connectionStatus === "unknown"
                    ? "Device status is unknown. It will be removed from the controller without a factory reset."
                    : "Remove this device from the controller inventory. A factory reset requires a fully managed device."}
            </p>
            <form method="POST" action="?/remove" onsubmit={confirmRemove}>
              <input type="hidden" name="deviceId" value={device.id} />
              <Button variant="danger" size="sm" type="submit">
                {canReset ? "Reset & Remove" : "Remove from controller"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    {/if}
  </TabLayout>
</Page>

<style lang="scss">
  .device-page-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .back-link {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 1px solid #dce4e9;
    border-radius: 4px;
    color: #6e7881;
    background: #fbfdff;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    color: #30373d;
    font-size: 20px;
    font-weight: 650;
  }

  .device-toolbar p {
    margin-top: 3px;
    color: #8a949c;
    font-size: 13px;
  }

  .device-hero {
    display: grid;
    grid-template-columns: minmax(260px, 1fr) minmax(360px, 1.4fr) auto;
    gap: 14px;
    align-items: center;
    border: 1px solid #eef1f3;
    border-radius: 6px;
    padding: 16px;
    background: var(--color-surface);
  }

  .hero-product {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .hero-product img {
    width: 132px;
    height: 92px;
    object-fit: contain;
  }

  .hero-product h2 {
    margin-top: 8px;
    color: #30373d;
    font-size: 24px;
    line-height: 1.15;
  }

  .hero-product p {
    margin-top: 5px;
    color: #7d8790;
    font-size: 13px;
  }

  .hero-facts {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid #eef1f3;
    border-radius: 5px;
    overflow: hidden;
  }

  .hero-facts div {
    display: grid;
    gap: 6px;
    min-height: 70px;
    padding: 12px;
    border-right: 1px solid #eef1f3;
  }

  .hero-facts div:last-child {
    border-right: 0;
  }

  .hero-facts span,
  .section-heading span,
  .section-heading a {
    color: #8a949c;
    font-size: 12px;
    font-weight: 700;
  }

  .hero-facts strong {
    min-width: 0;
    color: #30373d;
    font-size: 14px;
    overflow-wrap: anywhere;
  }

  .hero-actions {
    display: grid;
    gap: 8px;
    justify-items: stretch;
  }

  .primary-action,
  .secondary-action,
  .danger-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    border-radius: 5px;
    padding: 0 14px;
    font-weight: 750;
    cursor: pointer;
    text-decoration: none;
    white-space: nowrap;
  }

  .primary-action {
    border: 1px solid var(--color-brand);
    color: var(--color-surface);
    background: var(--color-brand);
  }

  .secondary-action {
    border: 1px solid #dce4e9;
    color: #30373d;
    background: #fbfdff;
  }

  .terminal-link {
    justify-self: start;
    gap: 8px;
  }

  .danger-action {
    border: 1px solid var(--color-danger);
    color: var(--color-surface);
    background: var(--color-danger);
  }

  .status-pill,
  .status-value {
    color: #7d8790;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 999px;
    padding: 0 9px;
    background: #f1f4f6;
    font-size: 12px;
    font-weight: 800;
  }

  .status-online,
  .status-success {
    color: #0d704f;
    background: #eaf8f1;
  }

  .status-offline,
  .status-danger,
  .status-auth_failed,
  .status-blocked {
    color: #ad2d2d;
    background: #fff0f0;
  }

  .status-running {
    color: var(--color-link);
  }

  .status-warning {
    color: #9a6a14;
  }

  .content-section {
    display: grid;
    gap: 14px;
    border: 1px solid #eef1f3;
    border-radius: 6px;
    padding: 16px;
    background: var(--color-surface);
  }

  .section-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .section-heading h2 {
    color: #30373d;
    font-size: 15px;
    font-weight: 800;
  }

  .section-heading a {
    color: var(--color-link);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .info-row {
    display: grid;
    gap: 6px;
    min-width: 0;
    border: 1px solid #f0f2f4;
    border-radius: 5px;
    padding: 12px;
    background: #fbfdff;
  }

  .info-row span {
    color: #8a949c;
    font-size: 12px;
    font-weight: 700;
  }

  .info-row strong {
    min-width: 0;
    color: #30373d;
    font-size: 14px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .token-groups,
  .advanced-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .token-groups > div,
  .advanced-block {
    display: grid;
    gap: 10px;
    border: 1px solid #f0f2f4;
    border-radius: 5px;
    padding: 12px;
    background: #fbfdff;
  }

  .token-groups strong,
  .advanced-block strong {
    color: #30373d;
    font-size: 13px;
  }

  .tokens {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tokens span {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border-radius: 999px;
    padding: 0 9px;
    color: #5e6972;
    background: #eef3f6;
    font-size: 12px;
    font-weight: 700;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  th,
  td {
    height: 42px;
    border-bottom: 1px solid #f0f2f4;
    padding: 0 12px;
    color: #323a40;
    font-size: 13px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  th {
    color: #2f3438;
    font-weight: 800;
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .interface-state {
    color: #8a949c;
    font-weight: 700;
  }

  .interface-state.online {
    color: #1f9d55;
  }

  .job-list {
    display: grid;
  }

  .job-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
    gap: 16px;
    align-items: center;
    border-top: 1px solid #f0f2f4;
    padding: 12px 0;
    color: inherit;
    text-decoration: none;
  }

  .job-row:first-child {
    border-top: 0;
  }

  .job-row strong,
  .job-row span {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .job-row strong {
    color: #30373d;
    font-size: 13px;
  }

  .job-row span {
    margin-top: 4px;
    color: #8a949c;
    font-size: 12px;
  }

  .job-progress {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) 38px;
    gap: 10px;
    align-items: center;
  }

  .progress-bar {
    height: 5px;
    border-radius: 999px;
    background: #e8edf1;
    overflow: hidden;
  }

  .progress-bar span {
    display: block;
    height: 100%;
    min-width: 3px;
    border-radius: inherit;
    background: var(--color-link);
  }

  .job-progress small {
    color: #8a949c;
    font-size: 12px;
    text-align: right;
  }

  .advanced-block p,
  .muted,
  .empty-state {
    color: #8a949c;
    font-size: 13px;
    line-height: 1.45;
  }

  .migrate-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }

  .migrate-select {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-border, var(--color-line));
    border-radius: var(--radius-md, 6px);
    font-size: 13px;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .public-ip-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
  }

  .public-ip-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--color-border, var(--color-line));
    border-radius: var(--radius-md, 6px);
    font-size: 13px;
    background: var(--color-surface);
    color: var(--color-text);
  }

  .danger-block {
    border-color: #f1c7c7;
    background: #fff8f8;
  }

  .mono-cell {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: #8a949c;
  }

  .action-link {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    border: 1px solid var(--color-brand);
    border-radius: 4px;
    padding: 0 10px;
    color: var(--color-brand);
    background: transparent;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;

    &:hover {
      background: color-mix(in srgb, var(--color-brand) 8%, transparent);
    }
  }

  .action-link-warning {
    border-color: var(--color-warning, #d97706);
    color: var(--color-warning, #d97706);

    &:hover {
      background: color-mix(
        in srgb,
        var(--color-warning, #d97706) 8%,
        transparent
      );
    }
  }

  .fw-detail-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 120px;
    text-align: center;
  }

  .message-link {
    display: block;
    margin-top: 6px;
    color: inherit;
    font-weight: 800;
    text-decoration: underline;
  }

  .error-message,
  .message-success {
    border-radius: 6px;
    padding: 10px 12px;
  }

  .error-message {
    border: 1px solid #efb8b8;
    color: var(--color-danger);
    background: #fff2f2;
  }

  .message-success {
    border: 1px solid #a8d9c8;
    color: #0d5f48;
    background: #effaf5;
  }

  @media (max-width: 1120px) {
    .device-hero {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero-actions {
      justify-items: start;
    }
  }

  @media (max-width: 760px) {
    .hero-product {
      align-items: flex-start;
      flex-direction: column;
    }

    .hero-facts,
    .info-grid,
    .token-groups,
    .advanced-grid,
    .job-row {
      grid-template-columns: minmax(0, 1fr);
    }

    .hero-facts div {
      border-right: 0;
      border-bottom: 1px solid #eef1f3;
    }

    .hero-facts div:last-child {
      border-bottom: 0;
    }
  }

  .traffic-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px;
  }

  .traffic-card {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
  }

  .traffic-card-name {
    color: var(--color-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .legend-rx-label {
    color: var(--color-link, #3b82f6);
    font-weight: 600;
  }

  .legend-tx-label {
    color: var(--color-success, #22c55e);
    font-weight: 600;
  }

  .chain-badge,
  .action-badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .chain-input {
    background: #e8f4fd;
    color: #1565c0;
  }
  .chain-forward {
    background: #e8f0fe;
    color: #3949ab;
  }
  .chain-output {
    background: #f3e8fd;
    color: #6a1b9a;
  }

  .action-accept {
    background: #e8f5e9;
    color: #2e7d32;
  }
  .action-drop {
    background: #fce4ec;
    color: #b71c1c;
  }
  .action-reject {
    background: #fff3e0;
    color: #e65100;
  }
  .action-log {
    background: #f3f4f6;
    color: #374151;
  }
  .action-jump,
  .action-return,
  .action-passthrough {
    background: #fafafa;
    color: #6b7280;
  }

  .disabled-row td {
    opacity: 0.45;
  }

  .comment-cell {
    color: #8a949c;
    font-size: 12px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .action-cell {
    width: 40px;
    padding: 0 8px;
    text-align: center;
  }

  .row-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid #f1c7c7;
    border-radius: 4px;
    background: #fff8f8;
    color: #ad2d2d;
    font-size: 11px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s;
  }

  tr:hover .row-delete-btn {
    opacity: 1;
  }

  .add-rule-section {
    border-top: 1px solid #f0f2f4;
    padding-top: 14px;
  }

  .add-rule-label {
    color: #30373d;
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 10px;
  }

  .add-form {
    display: grid;
    gap: 12px;
    align-items: end;
  }

  .add-form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }

  .form-field-wide {
    grid-column: span 2;
  }

  .form-field {
    display: grid;
    gap: 4px;
  }

  .form-field span {
    color: #8a949c;
    font-size: 11px;
    font-weight: 700;
  }

  .form-field input,
  .form-field select {
    height: 32px;
    border: 1px solid #dce4e9;
    border-radius: 4px;
    padding: 0 8px;
    color: #30373d;
    background: #fbfdff;
    font-size: 13px;
    width: 100%;
    box-sizing: border-box;
  }

  .form-field input:focus,
  .form-field select:focus {
    outline: none;
    border-color: var(--color-brand);
  }

  .device-name-row {
    margin-top: 8px;
  }

  .rename-form {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rename-input {
    height: 34px;
    border: 1px solid #dce4e9;
    border-radius: 4px;
    padding: 0 10px;
    color: #30373d;
    background: #fbfdff;
    font-size: 16px;
    font-weight: 600;
    width: 220px;
    box-sizing: border-box;
  }

  .rename-input:focus {
    outline: none;
    border-color: var(--color-brand);
    background: #fff;
  }

  .rename-checkbox {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
  }

  .rename-checkbox span {
    color: #7d8790;
    font-size: 12px;
    font-weight: 600;
  }

  .rename-checkbox input[type="checkbox"] {
    width: 14px;
    height: 14px;
    accent-color: var(--color-brand);
    cursor: pointer;
  }
</style>
