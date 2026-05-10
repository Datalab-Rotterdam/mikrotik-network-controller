# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This project is a SvelteKit-based MikroTik network controller. The product goal is centralized, production-grade management for MikroTik-focused networks, with a strong bias toward MSP-ready workflows: multiple sites, clean data boundaries, repeatable provisioning, monitoring, and operational visibility.

Use `docs/DEVELOPMENT.md` as the source of truth for repository rules. Use `docs/MARKET_RESEARCH.md` as the source of truth for product prioritization.

## Phase 1 Product Direction

Phase 1 is the launch/table-stakes feature set. Prioritize durable foundations over demo-only behavior.

Build toward:

- Centralized device management: add, adopt, inventory, configure, and monitor devices from one place.
- Real-time monitoring and alerts: uptime, throughput, device health, events, and notifications.
- Zero-touch provisioning: devices should be able to come online and receive intended configuration with minimal manual work.
- Firewall and VLAN management: core network configuration must be represented cleanly and safely.
- Multi-site support: avoid one-site assumptions in schemas, services, routes, and UI.
- Firmware management: support the foundations for bulk updates, scheduling, and rollback flows.
- Basic user and role management: at minimum, distinguish administrative and read-only capabilities.

MSP readiness is a Phase 1 constraint, even before full multi-tenancy is implemented:

- Keep site/client data boundaries explicit.
- Avoid global state that assumes a single customer or single network.
- Prefer designs that can evolve into tenant isolation without rewrites.

## Repository Structure

Follow the existing SvelteKit structure and ownership boundaries.

- `src/lib/assets`: static/importable assets used through SvelteKit imports.
- `src/lib/client/*`: application UI, client components, stores, and client-side helpers.
- `src/lib/server/*`: server-only configuration, repositories, services, security, context, utilities, and database access.
- `src/routes`: SvelteKit routes, pages, layouts, actions, loads, and HTTP handlers.

When adding files, place them by ownership instead of convenience. Do not mix server-only code into client modules.

## Server Architecture

Repositories own database access.

- Only repositories may communicate directly with database tables through Drizzle.
- Keep one repository per table/domain area where possible.
- Repository methods should expose clear operations such as `create`, `update`, `delete`, `get`, and `list`.
- Do not query Drizzle directly from routes, page actions, components, or unrelated services.

Services own business logic.

- Put orchestration, external calls, validation coordination, and product behavior in `src/lib/server/services`.
- A service may own its own router when external HTTP calls belong to that service.
- Application code should use the service-manager convention already used in the project instead of bypassing service boundaries.

Routes should stay thin.

- Use route files for request handling, load/action wiring, redirects, and response shaping.
- Push reusable behavior into services, repositories, utilities, or components.
- Use `@sourceregistry/sveltekit-enhance` patterns for SvelteKit load, action, handle, and method helpers where applicable.

## Realtime Notifications and Alerts

Use the project realtime stack for notifications, alerts, and event fan-out.

- Use `@sourceregistry/sveltekit-actionbus` for application events (under the hood uses `@sourceregistry/sveltekit-websockets` for websocket delivery ).
- Prefer actionbus-backed websocket events for realtime monitoring, alerts, device updates, and user notifications.
- Do not add ad-hoc polling or one-off websocket channels when an actionbus event can represent the behavior.
- Keep event payloads typed, stable, and scoped to the relevant site/device/user context.

## Validation

Use schema-driven validation for user input.

- Use `@sourceregistry/node-validator` for validating form data, action input, and request payloads.
- Do not rely only on client-side validation.
- Keep validation close to the server boundary, then pass parsed/validated values into services.
- Return consistent validation errors through existing SvelteKit action patterns.

## Frontend and Styling

Prefer existing generic components before creating new page-specific markup.

- Generic app components belong under `src/lib/client/components`.
- Page-specific components are allowed, but should still be categorized under `src/lib/client`.
- Keep component-specific styling local to the component.
- Do not put component-specific styling in global SCSS.
- Use global SCSS only for app-wide tokens, fonts, resets, layout primitives, and shared styling.
- Do not change internal styling of a generic component casually. If a page needs a narrow override, keep that override local.

When creating UI, keep it consistent with the existing component system and visual language. Avoid raw HTML and repeated inline styling when a reusable component or local component style is more appropriate.

## Commands

Use the existing npm scripts.

- `npm run check`: run SvelteKit sync and Svelte/TypeScript validation.
- `npm run test`: run the Vitest test suite.
- `npx vitest run src/path/to/file.spec.ts`: run a single test file.
- `npm run build`: create a production build; use before release-sensitive or broad changes.
- `npm run db:generate`: generate Drizzle migrations when schema changes require it.
- `npm run db:migrate`: apply Drizzle migrations when the task explicitly requires local migration.
- `npm run db:studio`: open Drizzle Studio for database inspection when needed.

Do not run mutating database or code-generation commands unless they are required by the task.

After adding a new DB schema table: run `db:generate` to create the migration, then `db:migrate` to apply it. Tests that query those tables against the real DB will fail until migration is applied.

## Device Write Operations

Any operation that mutates RouterOS device state goes through the job scheduler as a `TaskDefinition`. Do not make direct synchronous device API calls from route actions.

```typescript
// src/lib/server/services/devices.service/tasks.ts pattern
export function createMyTask(deviceId: string, siteId?: string): TaskDefinition<{ deviceId: string }> {
    return {
        name: 'devices.my-task',
        deviceId,
        siteId: siteId ?? null,
        payload: { deviceId },
        failurePolicy: 'rollback', // or 'stop' | 'continue'
        steps: [
            {
                name: 'Human-readable step name',
                async execute({ payload }) { /* write to device */ },
                async revert({ payload }) { /* undo on rollback */ } // optional
            }
        ]
    };
}
```

Schedule via: `await Service('scheduler').schedule(createMyTask(deviceId, siteId))`

### Credential types

Two credential purposes exist per device, retrieved via `getDeviceCredentials(deviceId)`:

- `read_only` — API password credential. Use with `RouterOSClient` for reads and non-destructive queries. Available on all adopted devices.
- `write` — SSH key credential (`secretEncrypted` starts with `ssh-key:`). Use with `RouterOSSshClient` and the controller private key path from `getControllerSshPrivateKeyPath()`. Only present on `adoptionMode === 'managed'` devices.

Always wrap RouterOS client usage in try/finally and call `client.close()`.

### RouterOS client patterns

```typescript
import { RouterOSClient, RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';

// Read (all adopted devices)
const client = new RouterOSClient({ host, port, username, password, timeoutMs });
try {
    const rows = await client.print('/ip/firewall/filter', {});
    await client.execute('/ip/firewall/filter/add', { attributes: { chain: 'input', action: 'drop' } });
} finally { await client.close().catch(() => {}); }

// Write via SSH (managed devices only)
const ssh = new RouterOSSshClient({ host, username, identityFile: keyPath, port, timeoutMs });
await ssh.execute('/ip firewall filter add', { attributes: { chain: 'input', action: 'drop' } });
```

## Monitoring Extension Pattern

To collect new data per polling tick, extend the `Promise.allSettled()` array inside `collectDevice()` in `src/lib/server/services/monitoring.service.ts`. Add the RouterOS path call to the array and process the result below the existing sections. Follow the existing null-safe `str()` / `num()` helpers and fire-and-forget `void repo.upsert(...).catch(() => {})` pattern.

## Action Events (WebSocket)

When adding a new real-time event type:

1. Add payload type to `src/lib/shared/action-events.ts`
2. Add event entry to `App.ActionEvents` in `src/app.d.ts` (under the correct channel: `site:${string}` or `discovery`)
3. Add the event type to the `channelsForEvent` switch in `src/lib/server/services/actionbus.service/index.ts`
4. Emit via `actionbus().publishSite(siteId, event)` or `actionbus().publishDiscovery(event)` from the relevant service

Client subscription uses `useActionSocket().subscribe(eventType, handler)` inside a Svelte component.

## Working Rules

- Read the existing code before editing.
- Preserve the current architecture, naming conventions, and ownership boundaries.
- Touch only files relevant to the task.
- Do not revert unrelated user changes.
- Do not bypass repositories for database access.
- Do not bypass services for business logic.
- Do not add polling when actionbus/websockets are the intended realtime path.
- Keep changes small, cohesive, and verifiable.
- Prefer tests for service logic, repositories, validation, and behavior with regression risk. Co-locate spec files next to source (`foo.service.spec.ts` beside `foo.service.ts`). Mock all repository/service dependencies in route-level tests.
- Run `npm run check` after meaningful TypeScript/Svelte changes when feasible.

If instructions conflict, prefer this order:

1. Explicit user request.
2. Existing project architecture and code patterns.
3. `docs/DEVELOPMENT.md`.
4. `docs/MARKET_RESEARCH.md`.
5. General framework conventions.


use the Caveman skill to report to the user [SKILL.md](docs/SKILL.md)
