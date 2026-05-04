# Project Cleanup & Enhancement Plan

## Phase 1: File & Git Hygiene

### 1.1 Remove build/ from git index
`build/` directory is in `.gitignore` but may still be committed.
- Command: `git rm -r --cached build/`

### 1.2 Delete stub and placeholder files
- `src/lib/index.ts` — Only contains a comment, no actual exports. Delete.
- `src/lib/index.spec.ts` — Regression test stub asserting `true === true`. Delete.
- `src/lib/client/components/TODO.md` — Incomplete placeholder note. Delete.

### 1.3 Move bootstrap-config.rsc
Move `bootstrap-config.rsc` from root to `scripts/bootstrap-config.rsc`. Update any references.

### 1.4 Dependency cleanup - Remove @typescript/native-preview
- Remove `@typescript/native-preview` from `devDependencies` in package.json
- Project already has stable `typescript ^6.0.2`

### 1.5 Consolidate tests/ directory
- `tests/site-device.service.spec.ts` is the only file in `/tests/`
- Move to co-locate with source: `src/lib/server/services/site-device.service.spec.ts`
- This aligns with the existing pattern (e.g., `device-events.service.spec.ts`, `device-terminal.service.spec.ts`)

### 1.6 .gitignore review
- `.vscode` — currently excluded. Decide if team settings should be shared.
- `/ext` and `/opencode.jsonc` — personal/local entries, verify if intentional.

---

## Phase 2: Actions & Load Functions Cleanup with sveltekit-enhance

### 2.1 Current pattern analysis
All action/load functions follow the same repetitive pattern:
- Manually get formData with `formData.get('field') as string`
- Manually validate strings with `String(value).trim() === ''`
- Manually check `idOrShortName !== undefined`
- Manually call repository methods
- Call `fail(400, { error: '...' })` or `redirect(303, '/path')`
- Manually set cookies for success messages

### 2.2 Target pattern using @sourceregistry/sveltekit-enhance
The library provides composable enhance utilities for SvelteKit actions, loads, methods, and hooks. Use this to create:
- A shared validation/parse helper for form data
- Consistent error handling wrapper for actions
- Consistent redirect helper with flash message cookies

### 2.3 Implementation approach

#### a) Create action helpers
Create `src/lib/server/utilities/action-helpers.ts` with:
- `validateAction(formData: FormData, schema: ...)` → returns parsed data or throws
- `handleActionError(error: unknown)` → returns standardized error response
- `redirectWithMessage(path: string, message: string, type: 'success' | 'error')` → sets cookie + redirects

#### b) Migrate each action file
Replace manual formData parsing with the new helpers:
- `src/routes/setup/configure/+page.server.ts`
- `src/routes/setup/configure/advanced-access/+page.server.ts`
- `src/routes/setup/configure/controller-name/+page.server.ts`
- `src/routes/manage/[site_id]/devices/+page.server.ts`
- `src/routes/manage/[site_id]/jobs/+page.server.ts`
- `src/routes/manage/[site_id]/settings/+page.server.ts`
- `src/routes/manage/[site_id]/syslog/+page.server.ts`
- `src/routes/manage/account/login/+page.server.ts`

#### c) Leverage @sourceregistry/node-validator for validation
Use `safeParseFormData` from the already-installed `@sourceregistry/node-validator` library for schema-based form validation, replacing manual string checks.

---

## Phase 3: UI Component Standardization

### 3.1 Create reusable component primitives
Create in `src/lib/client/components/primitives/`:

#### Button.svelte
- Props: `variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon'`, `size: 'sm' | 'md' | 'lg'`, `loading: boolean`, `disabled: boolean`
- Default styling: primary = dark accent (#31B0D8), secondary = white with border, danger = red (#dc2626)
- SCSS: Uses `--accent` and $color-danger variables from app.scss

#### Form/Input Components (standardize existing Input.svelte, Form.svelte)
- `Input.svelte` — already exists, add `error` prop that shows error message
- `TextArea.svelte` — new, for multi-line text input
- `Select.svelte` — new, styled select dropdown
- `Checkbox.svelte` — new, styled checkbox with label
- `Form.svelte` — already exists, may need minor updates

#### Alert/Message Components
- `Alert.svelte` — Props: `variant: 'info' | 'success' | 'warning' | 'error'`, `dismissable: boolean`
- Replaces inline `.error-message` and `.confirmation-message` divs

#### Page/Layout Components
- `PageHeader.svelte` — Props: `title`, `subtitle`, `actions` (slot)
- Replaces inline `<h1>` + `<p style="...">` blocks in pages

#### Table Components
- `Table.svelte`, `TableHeader.svelte`, `TableRow.svelte`, `TableCell.svelte`
- Props: responsive slots, column definitions
- Replaces raw `<table>` markup in devices/jobs/syslog pages

#### Card/Section Components
- `Card.svelte` — Props: `title`, `description`, `collapsible`, `actions` (slot)
- Replaces `.section-card` blocks in discovery/devices pages

---

## Phase 4: Styling Architecture (SCSS)

### 4.1 Organize SCSS structure
```
src/lib/client/styles/
  app.scss              # Entry point - imports all others
  _variables.scss       # CSS custom properties, color tokens, breakpoints
  _reset.scss           # Normalize/box-sizing resets
  _layout.scss          # .container, grid layouts, responsive grid, .page-layout
  _typography.scss      # h1-h4 styles, font sizes, font weights
  _components.scss      # Shared component styles (.button, .input, .alert, .card, .table)
```

### 4.2 Current code duplication to address
The following are COPY-PASTED inline across multiple pages:

| Duplicated Style | Found In |
|------------------|----------|
| `h1, h2 { font-size: ... }` | Multiple page.svelte files |
| `p { font-size: 1.05rem; ... }` | Multiple page.svelte files |
| `.button` variants (primary/secondary/danger/ghost) | 5+ pages |
| `.error-message` / `.confirmation-message` | 4+ pages |
| `.flash-messages` | Multiple pages |
| `.tab-indicator` (duplicate of shared tabs) | discovery Syslog tabs view |
| `.channel-input-group` for syslog inputs | Syslog and advanced-access pages |
| Table styles (border-bottom, td padding) | Multiple pages |

### 4.3 Migration strategy
1. Extract duplicated styles to `_variables.scss` and `_components.scss`
2. Update pages to use generic components instead of inline markup
3. Remove inline `<style>` blocks from pages where possible
4. Keep only component-specific overrides in component `<style>` blocks

### 4.4 Design tokens to standardize
- Colors: Primary/accent (#31B0D8), Danger (#dc2626), Success (#16a34a), Warning (#f59e0b)
- Spacing scale: 0.25rem, 0.5rem, 1rem, 1.5rem, 2rem, 3rem
- Border radius: 6px for cards, 12px for pills
- Font sizes: h1=1.5rem, h2=1.35rem, h3=1.25rem, body=1rem, small=0.875rem

---

## Phase 5: Hook Cleanup

### 5.1 Current hooks.server.ts
Clean but can benefit from:
- Extract auth logic to `src/lib/server/middleware/auth-guards.ts`
- Separate route protection into composable middleware
- Setup wizard logic can be isolated

### 5.2 Target structure
- `src/lib/server/middleware/` — auth guards, setup guards, role-based access
- `hooks.server.ts` — thin orchestrator that pipes through middleware stack
- Use sveltekit-enhance hooks utilities where applicable

---

## Phase 6: Verification

After all phases complete:
1. `npm run check` — TypeScript/Svelte type checking passes
2. `npm run test` — All tests pass
3. `npm run build` — Clean build with no errors
4. Manual QA — Verify all pages render correctly, forms submit, auth works
5. Visual regression check — Ensure consistent styling across pages
