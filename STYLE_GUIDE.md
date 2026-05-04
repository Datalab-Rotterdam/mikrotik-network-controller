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

## 3. Layout Components

- **ResponsiveGrid**: responsive grid layout
- **ColumnLayout/Column**: multi-column layouts
- **SidePanel**: sliding detail panel
- **TabLayout**: tab navigation with href
- **SetupSplit**: two-column wizard layout

## 4. Page-Level Styling Rules

### Rule 1: Use primitives, never inline HTML

Use `<Button variant="primary">` not `<button class="btn-primary">`.

### Rule 2: Component styles are scoped

Each component uses scoped `<style lang="scss">` blocks. Classes do not leak.

### Rule 3: Reference design tokens

Use CSS variables for colors, spacing, typography. Never hardcode hex values.

### Rule 4: No copy-pasted CSS

Extract shared patterns into components. Never duplicate button, alert, form, or card CSS across pages.

### Rule 5: Global utilities only in `app.scss`

Only these classes are globally available:

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

## 5. Component File Structure

```
src/lib/client/components/primitives/
  └── MyComponent.svelte
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

## 6. Common Patterns

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

### Data tables

Use `.table-wrapper` and `.table-base` from `app.scss`, extend in page styles.

## 7. Migration Checklist

When migrating a page from raw HTML to primitives:

1. Replace `<button>` with `<Button variant="...">`
2. Replace `<input>` with `<Input>` / `<Select>` / `<TextArea>` / `<Checkbox>`
3. Replace page title bars with `<PageHeader>`
4. Remove copied `.btn-*`, `.field`, `.alert` CSS from page `<style>`
5. Keep only page-specific styles (tables, badges, special layouts)
6. Verify with `npx svelte-check --threshold error` and `npx vitest run`
