<script lang="ts">
  import {
    Background,
    BackgroundVariant,
    Controls,
    SvelteFlow,
    type Edge,
    type Node,
    type NodeTypes,
  } from '@xyflow/svelte';
  import {
    portLayoutCatalog,
    type DevicePortInterface,
    type PortLayoutEntry,
  } from '$lib/shared/device-port-layouts';
  import DevicePortLayout from '$lib/client/components/ui/DevicePortLayout.svelte';
  import TopologyDeviceNode from '$lib/client/components/ui/TopologyDeviceNode.svelte';
  import '@xyflow/svelte/dist/style.css';

  let { data }: { data: { modelImages: Record<string, string> } } = $props();

  const STATUSES = ['online', 'offline', 'auth_failed', 'discovered'] as const;
  const KINDS = ['router', 'switch'] as const;

  const nodeTypes: NodeTypes = { device: TopologyDeviceNode };

  // Derive mock interface data from layout port definitions
  function mockInterfaces(entry: PortLayoutEntry): DevicePortInterface[] {
    const allPorts = entry.groups.flatMap((g) => g.rows.flat());
    return allPorts.map((port, index) => ({
      id: `mock-${index}`,
      name: port.name,
      type: port.kind ?? 'ether',
      macAddress: `AA:BB:CC:DD:EE:${String(index % 256).padStart(2, '0')}`,
      comment: index === 0 ? 'uplink' : undefined,
      running: index % 5 !== 0 && index % 7 !== 0,
      disabled: index % 7 === 0,
    }));
  }

  function isSwitch(model: string) {
    const m = model.toLowerCase();
    return m.startsWith('css') || m.startsWith('crs') || m.includes('switch');
  }

  // Build topology nodes in a grid layout
  const COLS = 3;
  const COL_W = 200;
  const ROW_H = 160;

  const nodes = $derived<Node[]>(
    portLayoutCatalog.map((entry, index) => ({
      id: `mock-${index}`,
      type: 'device',
      position: {
        x: (index % COLS) * COL_W,
        y: Math.floor(index / COLS) * ROW_H,
      },
      data: {
        imageSrc: data.modelImages[entry.model] ?? '/favicon.svg',
        name: entry.model,
        model: entry.model,
        status: STATUSES[index % STATUSES.length],
        kind: isSwitch(entry.model) ? 'switch' : 'router',
        adopted: index % 4 !== 3,
      },
    }))
  );

  const edges = $derived<Edge[]>(
    portLayoutCatalog.slice(1).map((_, index) => ({
      id: `edge-${index}`,
      source: 'mock-0',
      target: `mock-${index + 1}`,
      type: 'smoothstep',
    }))
  );

  let selectedIndex = $state(0);
  const selectedEntry = $derived(portLayoutCatalog[selectedIndex]);
  const selectedInterfaces = $derived(mockInterfaces(selectedEntry));
</script>

<div class="dev-shell">
  <header class="dev-header">
    <span class="dev-badge">DEV</span>
    <h1>Device Preview</h1>
    <p>Auto-discovered from <code>portLayoutCatalog</code> — {portLayoutCatalog.length} models</p>
  </header>

  <div class="dev-body">
    <section class="topology-section">
      <h2>Topology nodes</h2>
      <div class="topology-wrap">
        <SvelteFlow
          {nodes}
          {edges}
          {nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={2}
          onnodeclick={({ node }) => {
            const index = portLayoutCatalog.findIndex((e) => e.model === node.data.name);
            if (index >= 0) selectedIndex = index;
          }}
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        </SvelteFlow>
      </div>
    </section>

    <section class="port-section">
      <div class="port-header">
        <h2>Port layout</h2>
        <select bind:value={selectedIndex}>
          {#each portLayoutCatalog as entry, i}
            <option value={i}>{entry.model}</option>
          {/each}
        </select>
      </div>

      <div class="model-meta">
        <span class="meta-tag">{isSwitch(selectedEntry.model) ? 'Switch' : 'Router'}</span>
        {#each selectedEntry.aliases as alias}
          <span class="meta-tag alias">{alias}</span>
        {/each}
      </div>

      <DevicePortLayout
        model={selectedEntry.model}
        interfaces={selectedInterfaces}
        variant="full"
      />
    </section>
  </div>
</div>

<style lang="scss">
  .dev-shell {
    display: flex;
    flex-direction: column;
    gap: 24px;
    min-height: 100vh;
    padding: 24px;
    background: var(--color-page, #f5f7f9);
  }

  .dev-header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;

    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text, #1a1e22);
    }

    p {
      margin: 0;
      color: var(--color-muted, #6f7a83);
      font-size: 13px;
    }

    code {
      font-size: 12px;
      padding: 1px 5px;
      border-radius: 3px;
      background: var(--color-border, #e2e7eb);
      color: var(--color-text, #1a1e22);
    }
  }

  .dev-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 4px;
    background: #f59e0b;
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }

  .dev-body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
    }
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 14px;
    border: 1px solid var(--color-border, #e2e7eb);
    border-radius: 8px;
    padding: 18px;
    background: var(--color-surface, #fff);
  }

  h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text, #1a1e22);
  }

  .topology-wrap {
    height: 380px;
    border: 1px solid var(--color-border, #e2e7eb);
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-page, #f5f7f9);

    :global(.svelte-flow__node-device) {
      border: 0;
      padding: 0;
      background: transparent;
    }

    :global(.svelte-flow__edges) {
      z-index: 0;
    }

    :global(.svelte-flow__nodes) {
      z-index: 1;
    }

    :global(.svelte-flow__handle) {
      opacity: 0;
      pointer-events: none;
    }
  }

  .port-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    select {
      padding: 5px 9px;
      border: 1px solid var(--color-border, #e2e7eb);
      border-radius: 4px;
      background: var(--color-surface, #fff);
      color: var(--color-text, #1a1e22);
      font-size: 13px;
      cursor: pointer;

      &:focus {
        outline: 2px solid var(--color-link, #0f6fff);
        outline-offset: 1px;
      }
    }
  }

  .model-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .meta-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-link, #0f6fff) 10%, transparent);
    color: var(--color-link, #0f6fff);
    font-size: 11px;
    font-weight: 600;

    &.alias {
      background: var(--color-border, #e2e7eb);
      color: var(--color-muted, #6f7a83);
      font-weight: 400;
    }
  }
</style>
