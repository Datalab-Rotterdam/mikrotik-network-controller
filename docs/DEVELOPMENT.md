# Development Guide

## Architecture

```
src/lib/server/repositories/   — DB access (Drizzle only here)
src/lib/server/services/        — Business logic and orchestration
src/lib/server/configurations/  — Environment and config
src/lib/client/components/      — Svelte UI components
src/lib/client/stores/          — Client-side reactive state
src/lib/shared/                 — Types shared between client and server
src/routes/                     — SvelteKit pages, layouts, actions, API handlers
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run check` | Svelte/TypeScript type checking |
| `npm run test` | Vitest test suite |
| `npm run build` | Production build |
| `npm run db:generate` | Generate Drizzle migrations after schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Open Drizzle Studio |

Only run `db:generate` and `db:migrate` when a task explicitly requires schema changes.

## Rules

**Repositories**
- Only repositories communicate with the DB through Drizzle.
- One repository per table/domain area.
- Methods: `create`, `update`, `delete`, `get`, `list`.
- Never query Drizzle directly from routes, services, or components.

**Services**
- Orchestration, external API calls, and product behavior live in services.
- Use the `sveltekit-service-manager` pattern for service access.

**Routes**
- Thin: request handling, load/action wiring, redirects, response shaping only.
- Use `@sourceregistry/sveltekit-enhance` for composable helpers.

**Realtime**
- Use `@sourceregistry/sveltekit-actionbus` for all application events.
- Do not add ad-hoc polling or one-off websocket channels.
- Event payloads must be typed and scoped to site/device context.

**Validation**
- Use `@sourceregistry/node-validator` for form data and request payloads.
- Validate at the server boundary; pass parsed values into services.

**Styling**
- Component-specific styles stay in the component `<style>` block.
- Global SCSS (`app.scss`) for tokens, fonts, resets, layout primitives only.
- All components must support light and dark mode via CSS custom properties.

## Testing

- Vitest for unit and integration tests.
- Co-locate spec files with source: `foo.service.spec.ts` next to `foo.service.ts`.
- Write tests for: service logic, repositories, validation, alert conditions, template rendering.
