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
  import PageHeader from "$lib/client/components/primitives/PageHeader.svelte";
  import { PageShell } from "$lib/client/components/layout";
  import DevicePortLayout from "$lib/client/components/ui/DevicePortLayout.svelte";
  import TabLayout from "$lib/client/components/layout/TabLayout.svelte";
  import TrafficSparkline from "$lib/client/components/ui/TrafficSparkline.svelte";
  import type { JobStatus } from "$lib/shared/action-events";

  type DeviceTab = "overview" | "firewall" | "vlans" | "activity" | "backups" | "advanced";
  type TabItem<T extends string = string> = {
    id: T;
    label: string;
    icon?: string;
  };

  let { data, form } = $props();

  const basePath = $derived(`/manage/${data.site.id}`);
  const device = $derived(data.device);
  const deviceName = $derived(device.identity ?? device.name);
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
    {
      id: "overview",
      label: "Overview",
      icon: "M7 3h2v18H7V3Zm8 0h2v18h-2V3ZM3 8h2v8H3V8Zm16 0h2v8h-2V8Z",
    },
    {
      id: "activity",
      label: "Activity",
      icon: "M5 19h14v2H5v-2Zm1-8h3v6H6v-6Zm5-8h3v14h-3V3Zm5 5h3v9h-3V8Z",
    },
    {
      id: "firewall",
      label: "Firewall",
      icon: "M12 1 3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5l-9-4Zm0 2.2 7 3.1V11c0 4.5-3 8.7-7 10-4-1.3-7-5.5-7-10V6.3l7-3.1Z",
    },
    {
      id: "vlans",
      label: "VLANs",
      icon: "M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z",
    },
    {
      id: "backups",
      label: "Backups",
      icon: "M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm1 14.93V17h-2v-.07A6 6 0 0 1 6.07 11H7v2h-.93A4 4 0 0 0 11 16.93V16h2v.93A4 4 0 0 0 16.93 13H17v-2h.93A6 6 0 0 1 13 16.93ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z",
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: "m19.4 13.5.1-1.5-.1-1.5 2-1.5-2-3.5-2.4 1a8.8 8.8 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A8.8 8.8 0 0 0 7 6L4.6 5 2.6 8.5l2 1.5-.1 1.5.1 1.5-2 1.5 2 3.5 2.4-1a8.8 8.8 0 0 0 2.6 1.5L10 22h4l.4-2.5A8.8 8.8 0 0 0 17 18l2.4 1 2-3.5-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z",
    },
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

  function confirmRemove(event: SubmitEvent) {
    const confirmed = confirm(
      `Factory reset ${deviceName} and remove it from the controller? This will erase the device configuration and reboot it.`,
    );

    if (!confirmed) {
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

<PageShell>
  <div class="device-page-header">
    <a
      class="back-link"
      href={`${basePath}/devices`}
      aria-label="Back to devices"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          fill="currentColor"
          d="m10.8 5.4 1.4 1.4L8 11h11v2H8l4.2 4.2-1.4 1.4L4.2 12l6.6-6.6Z"
        />
      </svg>
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
        <h2>{deviceName}</h2>
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
      {#if !provisioned}
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
          <div class="info-row">
            <span>Uptime</span>
            <strong>{formatUptime(device.uptimeSeconds)}</strong>
          </div>
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
        <DevicePortLayout
          model={device.model ?? deviceName}
          interfaces={data.interfaces}
          variant="full"
        />
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>State</th>
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
                    <td>{networkInterface.type || "-"}</td>
                    <td>{networkInterface.macAddress || "-"}</td>
                    <td>{networkInterface.comment || "-"}</td>
                  </tr>
                {/each}
              {:else}
                <tr>
                  <td colspan="5">
                    <div class="empty-state">No interfaces collected yet.</div>
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </div>
      </section>

      {#if Object.keys(data.ifaceTraffic).length > 0}
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
      {#if data.device.platform === "routeros"}
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
          <div class="empty-state">No firewall rules collected yet. Rules sync during the next monitoring tick.</div>
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
                    <td><span class="chain-badge chain-{rule.chain}">{rule.chain}</span></td>
                    <td><span class="action-badge action-{rule.action}">{rule.action}</span></td>
                    <td class="mono-cell">{rule.srcAddress || rule.inInterface || "—"}</td>
                    <td class="mono-cell">{rule.dstAddress || rule.outInterface || "—"}</td>
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
                          <form method="POST" action="?/deleteFirewallRule" use:enhance>
                            <input type="hidden" name="routerId" value={rule.routerId} />
                            <button
                              type="submit"
                              class="row-delete-btn"
                              onclick={(e) => { if (!confirm("Delete this firewall rule from the device?")) e.preventDefault(); }}
                            >✕</button>
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
            <form method="POST" action="?/addFirewallRule" use:enhance class="add-form">
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
                  <input type="text" name="srcAddress" placeholder="10.0.0.0/8" />
                </label>
                <label class="form-field">
                  <span>Dst Address</span>
                  <input type="text" name="dstAddress" placeholder="192.168.1.0/24" />
                </label>
                <label class="form-field">
                  <span>Protocol</span>
                  <input type="text" name="protocol" placeholder="tcp / udp / icmp" />
                </label>
                <label class="form-field">
                  <span>In Interface</span>
                  <input type="text" name="inInterface" placeholder="ether1" />
                </label>
                <label class="form-field">
                  <span>Src Port</span>
                  <input type="text" name="srcPort" placeholder="80 / 8080-8090" />
                </label>
                <label class="form-field">
                  <span>Dst Port</span>
                  <input type="text" name="dstPort" placeholder="443" />
                </label>
                <label class="form-field form-field-wide">
                  <span>Comment</span>
                  <input type="text" name="comment" placeholder="Optional description" />
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
          <div class="empty-state">No VLANs collected yet. VLANs sync during the next monitoring tick.</div>
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
                            <input type="hidden" name="routerId" value={vlan.routerId} />
                            <button
                              type="submit"
                              class="row-delete-btn"
                              onclick={(e) => { if (!confirm(`Delete VLAN ${vlan.vlanId} (${vlan.name}) from the device?`)) e.preventDefault(); }}
                            >✕</button>
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
                  <input type="number" name="vlanId" min="1" max="4094" required placeholder="100" />
                </label>
                <label class="form-field">
                  <span>Name *</span>
                  <input type="text" name="name" required placeholder="vlan-mgmt" />
                </label>
                <label class="form-field">
                  <span>Interface *</span>
                  <input type="text" name="interfaceName" required placeholder="ether1" />
                </label>
                <label class="form-field">
                  <span>Comment</span>
                  <input type="text" name="comment" placeholder="Optional description" />
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
                <svg
                  viewBox="0 0 24 24"
                  width="17"
                  height="17"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M4 5h16v14H4V5Zm2 2v10h12V7H6Zm1.4 2.4L8.8 8l3.2 3.2-3.2 3.2-1.4-1.4 1.8-1.8-1.8-1.8ZM12 14h4v2h-4v-2Z"
                  />
                </svg>
                <span>Open terminal</span>
              </button>
            {:else}
              <p class="muted">
                Terminal access is available only to administrators for managed
                RouterOS devices with SSH trust.
              </p>
            {/if}
          </div>
          <div class="advanced-block danger-block">
            <strong>Remove device</strong>
            <p>
              Factory reset the device and remove it from the controller
              inventory.
            </p>
            {#if device.platform === "routeros"}
              <form method="POST" action="?/remove" onsubmit={confirmRemove}>
                <input type="hidden" name="deviceId" value={device.id} />
                <Button variant="danger" size="sm" type="submit"
                  >Reset & Remove</Button
                >
              </form>
            {:else}
              <p class="muted">
                Only RouterOS devices can be reset and removed.
              </p>
            {/if}
          </div>
        </div>
      </section>
    {/if}
  </TabLayout>
</PageShell>

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

  .chain-input { background: #e8f4fd; color: #1565c0; }
  .chain-forward { background: #e8f0fe; color: #3949ab; }
  .chain-output { background: #f3e8fd; color: #6a1b9a; }

  .action-accept { background: #e8f5e9; color: #2e7d32; }
  .action-drop { background: #fce4ec; color: #b71c1c; }
  .action-reject { background: #fff3e0; color: #e65100; }
  .action-log { background: #f3f4f6; color: #374151; }
  .action-jump,
  .action-return,
  .action-passthrough { background: #fafafa; color: #6b7280; }

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
</style>
