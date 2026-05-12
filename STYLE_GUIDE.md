# Styling Guide — MikroTik Network Controller

## Architecture

Styles follow a **component-owned** model. Each Svelte component manages its own styling via scoped `<style lang="scss">` blocks. Shared styles live in `app.scss`.

## 1. Design Tokens

Defined in `_variables.scss` under `:root`.

### Colors

- `--color-brand` (#0e0e10) — Primary brand
- `--color-brand-muted` (#707372) — Muted brand text
- `--color-brand-light` (#c8c8c7) — Borders, dividers
- `--color-surface` (#ffffff) — Card backgrounds
- `--color-page` (#f3f4f4) — Page background
- `--color-line` (#dedfde) — Table rows
- `--color-text` (#171717) — Primary text
- `--color-muted` (#686c6b) — Secondary text
- `--color-link` (#0d6fd6) — Links, active states
- `--color-danger` (#8a1f1f) / `--color-danger-light` (#efb8b8) — Errors
- `--color-success` (#16a34a) / `--color-success-light` (#bbf7d0) — Success
- `--color-warning` (#f59e0b) / `--color-warning-light` (#fef3c7) — Warning
- `--color-info` (#0d6fd6) / `--color-info-light` (#bfdbfe) — Info

### Typography

- `--font-family`: Manrope, sans-serif
- `--font-mono`: JetBrains Mono
- `--font-size-h1/h2/h3/body/small`: 1.5rem/1.35rem/1.25rem/1rem/0.875rem
- `--font-weight-normal/medium/semibold/`**bold**`: 400/500/650/750`

### Spacing

- `--space-3xs/2xs/xs/sm/md/lg/xl/2xl`: 0.25rem to 4rem

### Radii

- `--radius-sm/md/lg/pill`: 3px/6px/12px/999px
- `--shadow-panel`: panel shadow

## 2. Primitive Components

### Button (Button.svelte)

Variants: primary, secondary, danger, warning, ghost, icon
Sizes: sm, md, lg
Props: loading, fullWidth, type

- primary: filled brand — main actions
- secondary: outlined brand — secondary actions
- danger: filled red — destructive actions
- warning: filled amber — reboots, upgrades
- ghost: transparent — cancel, back
- icon: minimal — toolbar icons

### Input (Input.svelte)

Props: label, name, type, value, placeholder, required, compact

Types: text, email, password, number, date, search, hidden

**Never use raw input elements. Always use Input.**

### Select (Select.svelte)

Props: label, name, options, value
Options: `[{ value: string, label: string }]`

### TextArea (TextArea.svelte)

Props: label, name, value, rows

### Checkbox (Checkbox.svelte)

Props: label, name, checked, value (for same-name groups)

### Switch (Switch.svelte)

Two-state toggle (iOS-style). Use for enable/disable features, recurring toggles.

Props: `checked` (bindable), `label?`, `name?`, `disabled?`, `id?`

```svelte
<Switch bind:checked={rule.enabled} label="Enabled" />
```

### Alert (Alert.svelte)

Variants: info, success, warning, error
Props: dismissable, onDismiss

### Card (Card.svelte)

Props: title, description, collapsible

### PageHeader (PageHeader.svelte)

Props: title, subtitle
Snippet: `{ actions() }` for right-aligned actions

### Form (Form.svelte)

Props: action, ariaLabel, compact

### Tag (Tag.svelte)

Small pill/tag for arbitrary labels (VLAN IDs, roles, device types, firmware channels).

Variants: default, success, warning, danger, info
Sizes: sm, md

```svelte
<Tag variant="warning" label="VLAN 10" />
<Tag variant="info" size="sm" label="1G" />
```

### Breadcrumb (Breadcrumb.svelte)

Navigation trail for nested pages.

Props: `items: { label: string; href?: string }[]`, `separator?`

```svelte
<Breadcrumb items={[
  { label: 'Devices', href: '/manage/site-id/devices' },
  { label: device.name }
]} />
```

### Tooltip (Tooltip.svelte)

Hover tooltip with a trigger inside.

Props: `text`, `position` (top/bottom/left/right), `delay?`, `{ children }`

```svelte
<Tooltip text="Reboot device">
  <IconButton onclick={() => reboot()}><span class="bi bi-arrow-clockwise"></span></IconButton>
</Tooltip>
```

### ProgressBar (Progress.svelte)

Thin progress bar for job progress, adoption, upload indicators.

Props: `value` (0–100), `label?`, `showValue?`, `variant` (default/success/warning/danger), `size` (sm/md)

```svelte
<ProgressBar {value} variant="default" showValue />
<!-- Minimal inline bar -->
<ProgressBar {progress} size="sm" />
```

### InfoRow (InfoRow.svelte)

Label-value row for detail panels (IP, version, serial, uptime, etc.). Always use this instead of repeating flex label-value rows.

Props: `label?`, `value?`, `mono?`, or `{ children }` snippet

```svelte
<InfoRow label="IP Address" value={device.ip} />
<InfoRow label="Serial" value={device.serial} mono />
```

### SectionLabel (SectionLabel.svelte)

Uppercase section header for grouping content in detail panels.

Props: `{ children }` snippet or text

```svelte
<SectionLabel>Device Info</SectionLabel>
<SectionLabel>Firmware</SectionLabel>
```

### ConfirmDialog (ConfirmDialog.svelte)

Branded confirmation modal. **Use this instead of native `window.confirm()`. Supports async confirm handlers.

Props: `open` (bindable), `title`, `message`, `confirmText?`, `cancelText?`, `variant` (danger/warning/info), `onConfirm?` (async allowed), `onCancel?`

```svelte
<ConfirmDialog
  bind:open={showDelete}
  title="Delete device"
  message="This will remove the device from the controller."
  variant="danger"
  confirmText="Delete"
  onConfirm={async () => await deleteDevice(id)}
/>
```

### Modal (Modal.svelte)

Generic modal overlay for forms, wizards, multi-step flows.

Props: `open` (bindable), `title`, `description?`, `align` (center/top), `width` (sm/md/lg/xl/auto), `onClose?`

```svelte
<Modal bind:open {title} description="Fill in device credentials" width="md">
  <Form action={adopt}>
    <Input name="host" label="Host" required />
    <Input name="password" label="Password" type="password" required />
    <Button variant="primary" type="submit">Adopt</Button>
  </Form>
</Modal>
```

### EmptyState (EmptyState.svelte)

Centered empty state with icon, title, description, optional action.
Props: icon, title, description, optional children snippet for actions.

```svelte
<EmptyState icon="..." title="No devices yet" description="Adopt a device to get started">
  <Button variant="primary" href="/adoption">Adopt Device</Button>
</EmptyState>
```

### StatusBadge (StatusBadge.svelte)

Dot + label badge for device status (online/offline/blocked/auth_failed/unknown/discovered).
Props: `status`, `size` (sm/md).

```svelte
<StatusBadge status={device.status} />
```

### TableSkeleton (TableSkeleton.svelte)

Loading placeholder styled to match DataTable columns.
Props: `columns?`, `rows?`. Use inside DataTable when `loading` is true.

### DataTable (DataTable.svelte)

Generic data table with sorting, loading state, empty state, and snippet-based cells.
Uses `.table-wrapper` / `.table-base` from `app.scss` internally.

Props: `columns: { key, label, sortable?, width?, className? }[]`, `data: T[]`, `loading?`, `emptyMessage?`, `onSort?`
Snippets: `cell({ row, column })` for custom cell rendering, `header` for custom header row, `footer` for custom footer.

```svelte
<DataTable {columns} {devices} loading={loading}>
  {#default { row }}
    <td><a href={href(row.id)}>{row.name}</a></td>
    <td><StatusBadge status={row.status} /></td>
    <td>{row.ip}</td>
  {/default}
</DataTable>
```

### Pagination (Pagination.svelte)

Page navigation with prev/next arrows, page numbers, and page info.
Props: `currentPage`, `totalPages`, `totalItems?`, `onPageChange`, `showPageNumbers?`

```svelte
<Pagination {currentPage} {totalPages} totalItems={totalClients} onPageChange={page => currentPage = page} />
```

## 3. Layout Components

### ResponsiveGrid (ResponsiveGrid.svelte)

Responsive grid layout.

### ColumnLayout/Column (ColumnLayout.svelte, Column.svelte)

Multi-column layouts with flexible column sizing.

### SidePanel (SidePanel.svelte)

Sliding detail panel (right-side, overlay).
Props: `open` (bindable), `title`, `description?`, `closeHref`, `onClose?`

### TabLayout (TabLayout.svelte)

Tab navigation with href-based cross-route tabs (links to different URLs).
Props: `tabs: { id, label, icon? }[]`, `activeTab`, `getHref`

### Tabs (Tabs.svelte)

Same-page filter tabs (does NOT do cross-route navigation). For toggling filters on a single page.
Props: `tabs: { id, label, icon?, count? }[]`, `activeTab`, `onTabChange`, `variant` (default/pills)

```svelte
<Tabs {tabs} activeTab={filter} onTabChange={setFilter} variant="pills" />
```

### IconButton (IconButton.svelte)

Square button for icons only. Use inside Tooltip for labeled toolbars.
Sizes: sm, md, lg

```svelte
<IconButton size="sm" onclick={handleClick}><span class="bi bi-gear"></span></IconButton>
```

### ContentGrid (ContentGrid.svelte)

Simple grid wrapper with consistent 14px gap. Use for dashboard card grids.

```svelte
<ContentGrid>
  <StatCard label="Devices" value={12} />
  <StatCard label="Clients" value={54} />
  <StatCard label="Throughput" value="1.2G" />
</ContentGrid>
```

### SetupSplit (SetupSplit.svelte)

Two-column wizard layout for setup flows.

## 4. UI Components (Domain-Specific)

### AccountMenu (AccountMenu.svelte)
User account dropdown in header.

### BrandMark (BrandMark.svelte)
Application logo/brand mark.

### SiteSwitcher (SiteSwitcher.svelte)
Multi-site dropdown selector.

### Avatar (Avatar.svelte)
Circle avatar with initials or image.
Props: `name`, `src?`, `size` (sm/md/lg), `alt?`

```svelte
<Avatar name="Admin User" size="md" />
<Avatar src="/photos/user.jpg" size="lg" alt="User photo" />
```

### DeviceIcon (DeviceIcon.svelte)
SVG icons for router/switch/AP device types.
Props: `type` (router/switch/ap), `size?`

```svelte
<DeviceIcon type={device.kind || "router"} size={24} />
```

### DevicePortLayout (DevicePortLayout.svelte)
Visual port layout for switch/router chassis diagrams.
Props: `model?`, `interfaces`, `variant` (compact/full + optional `chassis`)

### PortDetailPanel (PortDetailPanel.svelte)
Side-by-side or overlay panel showing per-port details: link status, PoE, traffic RX/TX, connected client, VLAN, actions.
Props: `port` (ResolvedPort), `metrics?`, `clientName?`, `vlanId?`, `poeWatts?`, `poeEnabled?`, `onClose?`, `onConfigure?`, `onTogglePoe?`

```svelte
{#if selectedPort}
  <PortDetailPanel
    {selectedPort}
    metrics={portMetrics}
    clientName={connectedClient}
    onClose={() => selectedPort = null}
    onConfigure={() => configurePort(selectedPort.name)}
  />
{/if}
```

### StatCard (StatCard.svelte)
Dashboard metric card with label, big value, subtitle, optional trend.
Props: `label`, `value`, `sub?`, `trend?` ({ up: boolean, label: string }), `{ children }` for custom icon.

```svelte
<StatCard label="Devices" value={12} sub="11 online · 1 offline" trend={{ up: true, label: "+2 this week" }}>
  <DeviceIcon type="router" size={20} />
</StatCard>
```

### Donut (Donut.svelte)
SVG donut chart for ratio visualization (online/offline, updates available).
Props: `value`, `total`, `color`, `label`, `size?`

```svelte
<Donut value={11} total={12} color="var(--color-success, #16a34a)" label="Online" />
```

### TrafficBar (TrafficBar.svelte)
RX/TX split progress bars per device with labels.
Props: `label`, `rx`, `tx`, `max?` (default 100 Mbps)

```svelte
<TrafficBar label="core-router-01" rx={42} tx={28} max={100} />
```

### TerminalPane (TerminalPane.svelte)
Terminal output viewer.

### TopologyDeviceNode (TopologyDeviceNode.svelte)
Topology graph node.

### TrafficSparkline (TrafficSparkline.svelte)
Tiny sparkline chart for traffic history.

### DiscoveryUpdatesWebSocket (DiscoveryUpdatesWebSocket.svelte)
WebSocket component for real-time discovery updates.

## 5. Global Utilities in `app.scss`

| Class | Purpose |
|---|---|
| `.error-message` | Error flash block (red) |
| `.confirmation-message` | Success flash block (green) |
| `.flash-messages` | Flash alert container |
| `.container` | Max-width 1200px wrapper |
| `.page-layout` | Grid page wrapper |
| `.table-wrapper` | overflow-x: auto wrapper |
| `.table-base` | Basic table styling |
| `.sr-only` | Screen-reader only text |

## 6. Page-Level Styling Rules

### Rule 1: Use primitives, never inline HTML

Use `<Button variant="primary">` not `<button class="btn-primary">`.

### Rule 2: Component styles are scoped

Each component uses scoped `<style lang="scss">` blocks. Classes do not leak.

### Rule 3: Reference design tokens

Use CSS variables for colors, spacing, typography. Never hardcode hex values in pages.

### Rule 4: No copy-pasted CSS

Extract shared patterns into components. Never duplicate button, alert, form, card, or table CSS across pages. If two pages need the same pattern, create a component.

### Rule 5: Global utilities only in `app.scss`

Only classes listed in Section 5 are globally available. Everything else is scoped.

### Rule 6: Use DataTable for any data table

Never use raw `<table>` elements. Always use `<DataTable>` with `columns` array + `data` array + snippet cells for domain-specific rendering.

### Rule 7: Use ConfirmDialog for any destructive action

Never use `window.confirm()`. Always use `<ConfirmDialog>` with `bind:open` + async `onConfirm`.

### Rule 8: Use ProgressBar for any progress indicator

Never use `<span style="width: ${progress}%">. Always use `<ProgressBar {value} size="sm">` inline or `<ProgressBar {value} showValue />` label variant.

### Rule 9: Use Breadcrumb for nested navigation

Any page beyond the first level should have a `<Breadcrumb>` near the top.

## 7. Component File Structure

```
src/lib/client/components/
├── primitives/          # Building blocks (Button, Input, DataTable, etc.)
│   └── index.ts         # Barrel export
├── layout/              # Structural (TabLayout, SidePanel, Tabs, etc.)
│   └── index.ts         # Barrel export
└── ui/                  # Domain-specific (StatCard, DeviceIcon, PortDetailPanel, etc)
    └── index.ts         # Barrel export
```

Each component:
```
MyComponent.svelte
  ├── <script lang="ts">    // Props via $props()
  ├── <template>            // Markup
  └── <style lang="scss">  // Scoped styles with CSS variables
```

Conventions:
- TypeScript for `<script>` (`lang="ts"`)
- SCSS for `<style>` (`lang="scss"`)
- CSS variables for all values
- Props over classes for configuration
- Rest spread (`{...rest}`) to forward DOM events
- `{@render children()` for slot-like content (Svelte 5+)
- Barrel exports per category for clean imports

```typescript
// Clean imports via barrel exports
import { Button, Card, DataTable, ConfirmDialog } from '$lib/components/primitives';
import { TabLayout, Tabs, SidePanel } from '$lib/components/layout';
import { StatCard, DeviceIcon, Avatar } from '$lib/components/ui';
```

## 8. Common Patterns

### Form rows

Define `.form-row` locally:
```scss
.form-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}
```

### Action bars

Flex justify-end with Button components.

### Detail panels

Use `<Card>` + `<SectionLabel>` + `<InfoRow>` for device/user detail cards.

```svelte
<Card title="Router Info">
  <SectionLabel>Device</SectionLabel>
  <InfoRow label="IP" value="10.0.0.1" />
  <InfoRow label="Version" value="7.14.3" mono />
  <SectionLabel>Firmware</SectionLabel>
  <InfoRow label="Channel" value="stable" />
</Card>
```

### Dashboard card grids

Use `<ContentGrid>` + `<StatCard>` + `<Card>`:

```svelte
<ContentGrid>
  <StatCard label="Devices" value={12} sub="11 online" />
  <StatCard label="Clients" value={54} />
  <StatCard label="Alerts" value={3} />
  <StatCard label="Throughput" value="1.2G" />
</ContentGrid>
```

### Device list with master-detail

Use `<DataTable>` + `<SidePanel>` together:

```svelte
<DataTable {columns} {devices}>
  {#default { row }}
    <td>...</td>
    <td><Button variant="secondary" onclick={() => selectedDevice = row}>Open</Button></td>
  {/default}
</DataTable>

{#if selectedDevice}
  <SidePanel bind:open={!!selectedDevice} title={selectedDevice.name} closeHref=".">
    <!-- Detail content -->
  </SidePanel>
{/if}
```

### Port diagram

Use `<DevicePortLayout>` + `<PortDetailPanel>`:

```svelte
<div class="port-view-container">
  <DevicePortLayout model={device.model} interfaces={interfaces} variant="chassis" />
  {#if selectedPort}
    <PortDetailPanel {port} onClose={() => selectedPort = null} />
  {/if}
</div>
```

## 9. Migration Checklist

When migrating a page from raw HTML to primitives:

1. Replace `<button>` with `<Button variant="...">`
2. Replace `<input>` with `<Input>` / `<Select>` / `<TextArea>` / `<Checkbox>` / `<Switch>`
3. Replace page title bars with `<PageHeader>`
4. Replace raw `<table>` with `<DataTable>` + custom cell snippets
5. Replace `window.confirm()` with `<ConfirmDialog>`
6. Replace inline `<span style="width: ${progress}%">` with `<ProgressBar>`
7. Replace hand-rolled `.tabs` / `.filter-tabs` with `<Tabs>`
8. Replace label-value rows with `<InfoRow>` + `<SectionLabel>`
9. Add `<Breadcrumb>` for nested pages
10. Remove copied `.btn-*`, `.field`, `.alert`, `.tabs` CSS from page `<style>`
11. Keep only page-specific styles (unique layouts, complex tables not suited for DataTable)
12. Verify with `npm run check` and `npm run test`
