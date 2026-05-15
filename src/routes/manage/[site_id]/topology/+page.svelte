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
  import { invalidate } from "$app/navigation";
  import SidePanel from "$lib/client/components/layout/SidePanel.svelte";
  import { Page, PageHeader } from "$lib/client/components/layout";
  import TopologyDeviceNode from "$lib/client/components/ui/TopologyDeviceNode.svelte";
  import { useActionSocket } from "$lib/client/actions/use-action-socket";
  import {
    discoveredDevices,
    initializeDiscoveryDeviceSnapshot,
  } from "$lib/client/stores/discovery-updates";
  import { get } from "svelte/store";
  import type { ActionEvent } from "$lib/shared/action-events";
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
  };

  const nodeTypes: NodeTypes = { device: TopologyDeviceNode };

  onMount(() => {
    initializeDiscoveryDeviceSnapshot(data.discoveredDevices);
  });

  const actions = useActionSocket();
  $effect(() =>
    actions.subscribe(["topology.updated"], (_event: ActionEvent) => {
      void invalidate(`app:topology:${data.site.id}`);
    })
  );

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
    if (text.includes("switchos") || text.includes("switch") || text.startsWith("css")) {
      return "switch";
    }
    return "router";
  }

  const topologyDevices = $derived<TopologyDevice[]>([
    ...data.devices.map((device) => ({
      id: device.id,
      nodeId: `device-${device.id}`,
      imageSrc: data.deviceImages[device.id]?.src ?? "/favicon.svg",
      name: device.name ?? device.identity,
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
    })),
  ]);

  // Build a host→nodeId lookup for resolving neighbor-only links
  const hostToNodeId = $derived(() => {
    const map = new Map<string, string>();
    for (const d of topologyDevices) {
      map.set(d.ipAddress, d.nodeId);
    }
    return map;
  });

  const adoptedDeviceIdToNodeId = $derived(() => {
    const map = new Map<string, string>();
    for (const d of data.devices) {
      map.set(d.id, `device-${d.id}`);
    }
    return map;
  });

  function buildNodes(): Node<DeviceNodeData>[] {
    const adoptedDevices = topologyDevices.filter((d) => d.adopted);
    const discoveredDevicesArr = topologyDevices.filter((d) => !d.adopted);
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
      ...discoveredDevicesArr.map((device, index) => ({
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
    const hostMap = hostToNodeId();
    const idMap = adoptedDeviceIdToNodeId();
    const edges: Edge[] = [];
    const seen = new Set<string>();

    for (const link of data.topologyLinks) {
      const sourceNodeId = idMap.get(link.sourceDeviceId);
      if (!sourceNodeId) continue;

      let targetNodeId: string | undefined;
      if (link.targetDeviceId) {
        targetNodeId = idMap.get(link.targetDeviceId);
      }
      if (!targetNodeId && link.targetHost) {
        targetNodeId = hostMap.get(link.targetHost);
      }
      if (!targetNodeId) continue;

      // Deduplicate bidirectional links
      const key = [sourceNodeId, targetNodeId].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      const label = [link.sourceInterface, link.targetInterface]
        .filter(Boolean)
        .join(' ↔ ') || link.discoveredVia;

      edges.push({
        id: `link-${link.id}`,
        source: sourceNodeId,
        target: targetNodeId,
        type: "smoothstep",
        label,
        animated: false,
      });
    }

    // Fall back to star topology from root if no real links exist yet
    if (edges.length === 0 && topologyDevices.length > 1) {
      const root = topologyDevices.find((d) => d.adopted) ?? topologyDevices[0];
      for (const device of topologyDevices) {
        if (device.nodeId === root.nodeId) continue;
        const key = [root.nodeId, device.nodeId].sort().join('|');
        edges.push({
          id: `star-${root.nodeId}-${device.nodeId}`,
          source: root.nodeId,
          target: device.nodeId,
          type: "smoothstep",
          label: device.adopted ? "inventory" : "discovered",
          style: device.adopted ? undefined : "stroke-dasharray: 6 5;",
        });
      }
    }

    return edges;
  }

  const nodes = $derived(buildNodes());
  const edges = $derived(buildEdges());
  let selectedNodeId = $state("");
  const selectedDevice = $derived(
    topologyDevices.find((d) => d.nodeId === selectedNodeId),
  );
  const deviceLinks = $derived(
    selectedDevice
      ? data.topologyLinks.filter(
          (l) => l.sourceDeviceId === selectedDevice.id || l.targetDeviceId === selectedDevice.id
        )
      : []
  );
  const adoptedCount = $derived(data.devices.length);
  const discoveredCount = $derived(runtimeDiscoveredDevices.length);
  const linkCount = $derived(data.topologyLinks.length);
  const interfaceCount = $derived(data.interfaces.length);

  $effect(() => {
    if (selectedNodeId && !topologyDevices.some((d) => d.nodeId === selectedNodeId)) {
      selectedNodeId = "";
    }
  });

  function selectDevice({ node }: { node: Node<DeviceNodeData> }) {
    selectedNodeId = node.id;
  }

  function formatUptime(seconds: number | null | undefined) {
    if (seconds == null) return "-";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return [days ? `${days}d` : "", hours ? `${hours}h` : "", minutes || (!days && !hours) ? `${minutes}m` : ""]
      .filter(Boolean).join(" ");
  }

  function formatDate(value: string | Date | null | undefined) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  }
</script>

{#snippet topologyActions()}
  <div class="topology-stats" aria-label="Topology summary">
    <span>{adoptedCount} adopted</span>
    <span>{discoveredCount} discovered</span>
    {#if linkCount > 0}<span>{linkCount} links</span>{/if}
    <span>{interfaceCount} interfaces</span>
  </div>
{/snippet}

<Page>
  <PageHeader
    title="Topology"
    subtitle="Adopted RouterOS and SwitchOS devices, plus discovered MikroTik neighbors."
    actions={topologyActions}
  />

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
      onClose={() => { selectedNodeId = ""; }}
    >
      <div class="topology-details">
        <div class="detail-hero">
          <img src={selectedDevice.imageSrc} alt="" width="112" height="76" />
          <strong>{selectedDevice.model || (selectedDevice.kind === "switch" ? "MikroTik switch" : "MikroTik router")}</strong>
        </div>

        <div class="details-card">
          <div class="info-row">
            <span>Status</span>
            <strong class="status-{selectedDevice.status}">{selectedDevice.status}</strong>
          </div>
          <div class="info-row">
            <span>IP Address</span>
            <strong>{selectedDevice.ipAddress || "-"}</strong>
          </div>
          <div class="info-row">
            <span>Platform</span>
            <strong>{selectedDevice.platform === "switchos" ? "SwitchOS" : "RouterOS"}</strong>
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

        {#if deviceLinks.length > 0}
          <div class="details-card">
            <div class="card-heading">
              <strong>Links</strong>
              <span>{deviceLinks.length}</span>
            </div>
            {#each deviceLinks as link}
              <div class="info-row">
                <span>{link.sourceInterface ?? link.discoveredVia}</span>
                <strong>{link.targetIdentity ?? link.targetHost ?? "—"}</strong>
              </div>
            {/each}
          </div>
        {/if}

        {#if selectedDevice.adopted && selectedDevice.interfaces.length > 0}
          <div class="details-card">
            <div class="card-heading">
              <strong>Interfaces</strong>
              <span>{selectedDevice.interfaces.length}</span>
            </div>
            {#each selectedDevice.interfaces as networkInterface}
              <div class="info-row">
                <span>{networkInterface.name}</span>
                <strong>{networkInterface.running ? "Running" : networkInterface.disabled ? "Disabled" : "Inactive"}</strong>
              </div>
            {/each}
          </div>
        {/if}

        {#if selectedDevice.adopted}
          <a
            class="detail-action"
            href={`/manage/${data.site.id}/devices/${selectedDevice.id}`}
          >
            View device →
          </a>
        {/if}
      </div>
    </SidePanel>
  {/if}
</Page>

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

  .topology-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    span {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 0 10px;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-surface);
      color: var(--color-muted);
      font-size: 13px;
    }
  }

  .topology-shell {
    flex: 1 1 auto;
    height: 0;
    min-height: 480px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-page);
  }

  .empty-state {
    display: grid;
    place-items: center;
    min-height: 420px;
    color: var(--color-muted);
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
    z-index: 1;
  }

  .topology-shell :global(.svelte-flow__node.selected .device-node) {
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--color-link, #0f6fff) 20%, transparent),
      0 8px 20px color-mix(in srgb, var(--color-text) 10%, transparent);
  }

  .topology-shell :global(.svelte-flow__edge-text) {
    fill: var(--color-muted);
    font-size: 11px;
  }

  .topology-shell :global(.svelte-flow__handle) {
    opacity: 0;
    pointer-events: none;
  }

  /* Edges always behind nodes */
  .topology-shell :global(.svelte-flow__edges) {
    z-index: 0 !important;
  }

  .topology-shell :global(.svelte-flow__nodes) {
    z-index: 1 !important;
  }

  /* Side panel content */
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

    img {
      width: 112px;
      height: 76px;
      object-fit: contain;
    }

    strong {
      color: var(--color-text);
    }
  }

  .details-card {
    display: grid;
    gap: 14px;
    border-radius: 6px;
    padding: 16px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .info-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, auto);
    gap: 16px;
    align-items: baseline;
    color: var(--color-text);
    font-size: 14px;

    strong {
      min-width: 0;
      color: var(--color-muted);
      font-weight: 500;
      text-align: right;
      overflow-wrap: anywhere;
    }

    .status-online { color: var(--color-success, #22c55e); }
    .status-offline { color: var(--color-danger, #ef4444); }
    .status-auth_failed { color: var(--color-warning, #f59e0b); }
  }

  .card-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: var(--color-text);

    span {
      color: var(--color-muted);
      font-size: 13px;
    }
  }

  .detail-action {
    display: block;
    padding: 10px 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-link);
    font-size: 13px;
    font-weight: 600;
    text-align: center;
    text-decoration: none;

    &:hover {
      border-color: var(--color-link);
      background: color-mix(in srgb, var(--color-link) 6%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--color-link);
      outline-offset: 2px;
    }
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
