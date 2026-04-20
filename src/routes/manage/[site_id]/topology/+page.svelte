<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    SvelteFlow,
    type Edge,
    type Node,
    type NodeTypes,
  } from "@xyflow/svelte";
  import { onMount } from "svelte";
  import SidePanel from "$lib/client/components/SidePanel.svelte";
  import TopologyDeviceNode from "$lib/client/components/TopologyDeviceNode.svelte";
  import DiscoveryUpdatesWebSocket from "$lib/client/components/DiscoveryUpdatesWebSocket.svelte";
  import {
    discoveredDevices,
    initializeDiscoveryDeviceSnapshot,
  } from "$lib/client/stores/discovery-updates";
  import { get } from "svelte/store";
  import "@xyflow/svelte/dist/style.css";

  let { data } = $props();

  type DeviceNodeData = {
    imageSrc: string;
    name: string;
    model: string;
    status: string;
    kind: "router" | "switch";
    adopted: boolean;
  };

  type TopologyDevice = DeviceNodeData & {
    id: string;
    nodeId: string;
    ipAddress: string;
    platform: string;
    version: string;
    macAddress: string;
    serialNumber: string;
    architecture: string;
    uptimeSeconds?: number | null;
    lastSyncAt?: Date | string | null;
    interfaceName: string;
    interfaces: typeof data.interfaces;
    connection: {
      source: string;
      target: string;
      label: string;
    } | null;
  };

  const nodeTypes: NodeTypes = { device: TopologyDeviceNode };

  onMount(() => {
    initializeDiscoveryDeviceSnapshot(data.discoveredDevices);
  });

  const runtimeDiscoveredDevices = $derived(
    get(discoveredDevices).length
      ? get(discoveredDevices)
      : data.discoveredDevices,
  );

  function deviceKind(
    platform: string | null | undefined,
    model: string | null | undefined,
  ): "router" | "switch" {
    const text = `${platform ?? ""} ${model ?? ""}`.toLowerCase();

    if (
      text.includes("switchos") ||
      text.includes("switch") ||
      text.startsWith("css")
    ) {
      return "switch";
    }

    return "router";
  }

  const topologyDevices = $derived<TopologyDevice[]>([
    ...data.devices.map((device) => ({
      id: device.id,
      nodeId: `device-${device.id}`,
      imageSrc: data.deviceImages[device.id]?.src ?? "/favicon.svg",
      name: device.identity ?? device.name,
      model: device.model ?? "",
      status: device.connectionStatus,
      kind: deviceKind(device.platform, device.model),
      adopted: true,
      ipAddress: device.host,
      platform: device.platform,
      version: device.routerOsVersion ?? "",
      macAddress: "",
      serialNumber: device.serialNumber ?? "",
      architecture: device.architecture ?? "",
      uptimeSeconds: device.uptimeSeconds,
      lastSyncAt: device.lastSyncAt,
      interfaceName: "",
      interfaces: data.interfaces.filter(
        (networkInterface) => networkInterface.deviceId === device.id,
      ),
      connection: null,
    })),
    ...runtimeDiscoveredDevices.map((device) => ({
      id: device.id,
      nodeId: `discovered-${device.id}`,
      imageSrc: data.deviceImages[device.id]?.src ?? "/favicon.svg",
      name: device.identity ?? "Discovered MikroTik",
      model: device.hardware ?? "",
      status: "discovered",
      kind: deviceKind(device.platform, device.hardware),
      adopted: false,
      ipAddress: device.address ?? "",
      platform: device.platform ?? "routeros",
      version: device.version ?? "",
      macAddress: device.macAddress ?? "",
      serialNumber: "",
      architecture: "",
      uptimeSeconds: undefined,
      lastSyncAt: undefined,
      interfaceName: device.interfaceName ?? "",
      interfaces: [],
      connection: null,
    })),
  ]);

  const rootDevice = $derived(
    topologyDevices.find((device) => device.adopted) ?? topologyDevices[0],
  );

  function buildNodes(): Node<DeviceNodeData>[] {
    const devices = topologyDevices;
    const adoptedDevices = devices.filter((device) => device.adopted);
    const discoveredDevices = devices.filter((device) => !device.adopted);

    return [
      ...adoptedDevices.map((device, index) => ({
        id: device.nodeId,
        type: "device",
        position: { x: index * 270, y: 80 },
        data: {
          imageSrc: device.imageSrc,
          name: device.name,
          model: device.model,
          status: device.status,
          kind: device.kind,
          adopted: device.adopted,
        },
      })),
      ...discoveredDevices.map((device, index) => ({
        id: device.nodeId,
        type: "device",
        position: { x: index * 270, y: adoptedDevices.length ? 310 : 80 },
        data: {
          imageSrc: device.imageSrc,
          name: device.name,
          model: device.model,
          status: device.status,
          kind: device.kind,
          adopted: device.adopted,
        },
      })),
    ];
  }

  function buildEdges(): Edge[] {
    const root = rootDevice;
    const devices = topologyDevices;

    if (!root) {
      return [];
    }

    return devices
      .filter((device) => device.nodeId !== root.nodeId)
      .map((device) => ({
        id: `${root.nodeId}-${device.nodeId}`,
        source: root.nodeId,
        target: device.nodeId,
        type: "smoothstep",
        label:
          device.interfaceName || (device.adopted ? "inventory" : "discovered"),
        style: device.adopted ? undefined : "stroke-dasharray: 6 5;",
      }));
  }

  const nodes = $derived(buildNodes());
  const edges = $derived(buildEdges());
  let selectedNodeId = $state("");
  const selectedDevice = $derived(
    topologyDevices.find((device) => device.nodeId === selectedNodeId),
  );
  const selectedConnection = $derived(
    edges.find(
      (edge) =>
        edge.source === selectedNodeId || edge.target === selectedNodeId,
    ),
  );
  const adoptedCount = $derived(data.devices.length);

  $effect(() => {
    const devices = topologyDevices;

    if (
      selectedNodeId &&
      !devices.some((device) => device.nodeId === selectedNodeId)
    ) {
      selectedNodeId = "";
    }
  });
  const discoveredCount = $derived(runtimeDiscoveredDevices.length);
  const interfaceCount = $derived(data.interfaces.length);

  function selectDevice({ node }: { node: Node<DeviceNodeData> }) {
    selectedNodeId = node.id;
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
</script>

<DiscoveryUpdatesWebSocket />

<section class="topology-page" class:with-panel={Boolean(selectedDevice)}>
  <div class="page-title">
    <div>
      <h1>Topology</h1>
      <p>
        Adopted RouterOS and SwitchOS devices, plus discovered MikroTik
        neighbors.
      </p>
    </div>
    <div class="topology-stats" aria-label="Topology summary">
      <span>{adoptedCount} adopted</span>
      <span>{discoveredCount} discovered</span>
      <span>{interfaceCount} interfaces</span>
    </div>
  </div>

  <section class="topology-shell">
    {#if adoptedCount || discoveredCount}
      <SvelteFlow
        {nodes}
        {edges}
        {nodeTypes}
        fitView
        minZoom={0.35}
        maxZoom={1.5}
        onnodeclick={selectDevice}
      >
        <Controls />
        <MiniMap pannable zoomable />
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
      </SvelteFlow>
    {:else}
      <div class="empty-state">
        Topology appears after devices are discovered or adopted.
      </div>
    {/if}
  </section>

  {#if selectedDevice}
    <SidePanel
      open={Boolean(selectedDevice)}
      title={selectedDevice.name}
      closeHref={`/manage/${data.site.id}/topology`}
      onClose={() => {
        selectedNodeId = "";
      }}
    >
      <div class="topology-details">
        <div class="detail-hero">
          <img src={selectedDevice.imageSrc} alt="" width="112" height="76" />
          <strong
            >{selectedDevice.model ||
              (selectedDevice.kind === "switch"
                ? "MikroTik switch"
                : "MikroTik router")}</strong
          >
        </div>

        <div class="details-card">
          <div class="info-row">
            <span>Status</span>
            <strong>{selectedDevice.status}</strong>
          </div>
          <div class="info-row">
            <span>IP Address</span>
            <strong>{selectedDevice.ipAddress || "-"}</strong>
          </div>
          <div class="info-row">
            <span>Platform</span>
            <strong
              >{selectedDevice.platform === "switchos"
                ? "SwitchOS"
                : "RouterOS"}</strong
            >
          </div>
          <div class="info-row">
            <span>Version</span>
            <strong>{selectedDevice.version || "-"}</strong>
          </div>
          <div class="info-row">
            <span>MAC Address</span>
            <strong>{selectedDevice.macAddress || "-"}</strong>
          </div>
          {#if selectedDevice.adopted}
            <div class="info-row">
              <span>Serial Number</span>
              <strong>{selectedDevice.serialNumber || "-"}</strong>
            </div>
            <div class="info-row">
              <span>Uptime</span>
              <strong>{formatUptime(selectedDevice.uptimeSeconds)}</strong>
            </div>
            <div class="info-row">
              <span>Last Sync</span>
              <strong>{formatDate(selectedDevice.lastSyncAt)}</strong>
            </div>
          {/if}
        </div>

        <div class="details-card">
          <div class="card-heading">
            <strong>Connection</strong>
            <span>{selectedConnection ? "inferred" : "none"}</span>
          </div>
          <div class="info-row">
            <span>Link</span>
            <strong>{selectedConnection?.label ?? "No known link yet"}</strong>
          </div>
          <div class="info-row">
            <span>Source</span>
            <strong
              >{selectedDevice.adopted ? "Inventory" : "MNDP discovery"}</strong
            >
          </div>
          {#if selectedDevice.interfaceName}
            <div class="info-row">
              <span>Interface</span>
              <strong>{selectedDevice.interfaceName}</strong>
            </div>
          {/if}
        </div>

        {#if selectedDevice.adopted}
          <div class="details-card">
            <div class="card-heading">
              <strong>Interfaces</strong>
              <span>{selectedDevice.interfaces.length}</span>
            </div>
            {#each selectedDevice.interfaces as networkInterface}
              <div class="info-row">
                <span>{networkInterface.name}</span>
                <strong
                  >{networkInterface.running
                    ? "Running"
                    : networkInterface.disabled
                      ? "Disabled"
                      : "Inactive"}</strong
                >
              </div>
            {:else}
              <p class="muted">No interfaces collected yet.</p>
            {/each}
          </div>
        {/if}
      </div>
    </SidePanel>
  {/if}
</section>

<style lang="scss">
  .topology-page {
    display: grid;
    min-height: calc(100vh - 82px);
    grid-template-rows: auto minmax(420px, 1fr);
    gap: 16px;
  }

  .topology-page.with-panel {
    padding-right: min(390px, 28vw);
  }

  .page-title {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.15;
  }

  p {
    margin: 7px 0 0;
    color: var(--color-muted);
    line-height: 1.5;
  }

  .topology-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .topology-stats span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    border: 1px solid #edf0f2;
    border-radius: 4px;
    padding: 0 10px;
    color: #59646d;
    background: var(--color-surface);
    font-size: 13px;
  }

  .topology-shell {
    min-height: 420px;
    border: 1px solid #edf0f2;
    border-radius: 6px;
    overflow: hidden;
    background: #fbfdff;
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 420px;
    color: #65737b;
    text-align: center;
  }

  .topology-shell :global(.svelte-flow) {
    width: 100%;
    height: 100%;
    min-height: 420px;
  }

  .topology-shell :global(.svelte-flow__node-device) {
    border: 0;
    padding: 0;
    background: transparent;
  }

  .topology-shell :global(.svelte-flow__node.selected .device-node) {
    border-color: #0f6fff;
    box-shadow:
      0 0 0 3px rgba(15, 111, 255, 0.12),
      0 8px 18px rgba(14, 14, 16, 0.08);
  }

  .topology-shell :global(.svelte-flow__node.selected .device-node.thumbnail) {
    box-shadow: none;
  }

  .topology-shell
    :global(.svelte-flow__node.selected .device-node.thumbnail img) {
    filter: drop-shadow(0 0 5px rgba(15, 111, 255, 0.22));
  }

  .topology-shell
    :global(.svelte-flow__node.selected .device-node.thumbnail strong) {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .topology-shell :global(.svelte-flow__edge-text) {
    fill: #6f7a83;
    font-size: 11px;
  }

  .topology-details {
    display: grid;
    gap: 16px;
  }

  .detail-hero {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 14px 0 6px;
    text-align: center;
  }

  .detail-hero img {
    width: 112px;
    height: 76px;
    object-fit: contain;
  }

  .detail-hero strong {
    color: #3a4248;
  }

  .details-card {
    display: grid;
    gap: 14px;
    border-radius: 6px;
    padding: 16px;
    background: #fbfdff;
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

  .card-heading span,
  .muted {
    color: #8a949c;
    font-size: 13px;
  }

  .muted {
    margin: 0;
  }

  @media (max-width: 900px) {
    .topology-page,
    .topology-page.with-panel {
      min-height: calc(100vh - 72px);
      grid-template-rows: auto minmax(360px, 1fr);
      padding-right: 0;
    }

    .page-title {
      align-items: flex-start;
      flex-direction: column;
    }

    .topology-stats {
      justify-content: flex-start;
    }

    .topology-shell,
    .empty-state,
    .topology-shell :global(.svelte-flow) {
      min-height: 360px;
    }
  }
</style>
