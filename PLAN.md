# MikroTik Network Controller — Roadmap

> Enterprise network controller in the spirit of UniFi: single-pane-of-glass visibility,
> zero-touch provisioning, centralised alerting, and scalable multi-site management —
> built for MikroTik hardware (RouterOS routers, CHR instances, CAPsMAN APs; SwitchOS experimental).

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🟡 | In progress / partial |
| ❌ | Not started |

---

## Current Foundation (already built before the roadmap)

| Area | Status |
|---|---|
| Auth (RBAC, MFA schema, sessions) | ✅ |
| Device adoption (read-only + managed) | ✅ |
| Job scheduler with per-step rollback | ✅ |
| LLDP/CDP discovery | ✅ |
| SSH terminal | ✅ |
| Audit logging | ✅ |
| WebSocket broadcast | ✅ |
| Sites management | ✅ |
| Syslog schema | ✅ Schema only |
| Backup schema | ✅ Schema, workflow partial |

---

## Phase 1 — Monitoring Foundation ✅

**Goal:** Every device streams real-time health and clients; dashboard comes alive.

| Item | Status |
|---|---|
| `device_metrics` + `interface_metrics` DB tables | ✅ |
| `device_clients` DB table (ARP / DHCP / CAPsMAN) | ✅ |
| Monitoring polling service (30 s interval) | ✅ |
| CPU / memory / temperature / uptime collection | ✅ |
| Per-interface rx/tx/errors/drops collection | ✅ |
| Client collection (ARP → DHCP → CAPsMAN merge) | ✅ |
| Daily metric pruning (30-day retention) | ✅ |
| Dashboard — live health gauges per device | ✅ |
| Dashboard — online count + client count (live) | ✅ |
| Clients page — full live table with filters | ✅ |
| Interface traffic charts on device detail page | ✅ |

---

## Phase 2 — Alerting System ✅

**Goal:** Operators are notified automatically without polling the UI.

| Item | Status |
|---|---|
| `alert_rules` DB table | ✅ |
| `alert_events` DB table | ✅ |
| `notification_channels` DB table | ✅ |
| `alert_rule_channels` join table | ✅ |
| Alert evaluator service (post-metric evaluation) | ✅ |
| Conditions: device_offline, cpu_above, memory_below, temperature_above | ✅ |
| Conditions: client_count_above / below | ✅ |
| Cooldown enforcement (per rule, per device) | ✅ |
| Auto-resolve when condition clears | ✅ |
| Notification service — webhook dispatch | ✅ |
| Notification service — Slack Incoming Webhook | ✅ |
| Notification service — email via nodemailer (optional dep) | ✅ |
| `alert.fired` / `alert.resolved` WebSocket events | ✅ |
| Alerts page — Events tab (live, acknowledge button) | ✅ |
| Alerts page — Rules tab (CRUD, channel assignment) | ✅ |
| Alerts page — Channels tab (webhook / Slack / email CRUD) | ✅ |
| Alert bell in topbar (live unacknowledged count) | ✅ |
| Alerts nav item in sidebar | ✅ |

---

## Phase 3 — Live Topology ✅

**Goal:** The topology page shows the real network graph with live status.

| Item | Status |
|---|---|
| `topology_links` DB table | ✅ |
| Extend telemetry tick to call `/ip/neighbor` → upsert links | ✅ |
| Reconcile with existing LLDP/CDP discovery service | ✅ Falls back to star if no real links yet |
| Topology page — nodes per device (colour by status) | ✅ |
| Topology page — edges from `topology_links` | ✅ |
| Topology page — traffic overlay (link throughput from `interface_metrics`) | 🟡 Deferred — needs per-link aggregation |
| Topology page — node click → device detail slide-over | ✅ |
| `topology:updated` WebSocket event + live refresh | ✅ |

---

## Phase 4 — Configuration Management ✅

**Goal:** Operators can template, push, version, and restore device configuration.

| Item | Status |
|---|---|
| Backup workflow — `/export` text backup via RouterOS API | ✅ |
| Backup workflow — binary backup via SSH + file storage | ❌ |
| Scheduled daily backup per managed device | ✅ |
| Backup retention policy (keep last N per device) | ✅ Keep last 10 per device |
| Backup tab UI on device detail (list + manual trigger) | ✅ |
| `config_templates` DB table | ✅ |
| `config_deployments` DB table | ✅ |
| Template renderer (`{{variable}}` substitution) | ✅ |
| Dry-run diff mode | ✅ `diffConfigs()` implemented |
| Template CRUD UI | ✅ |
| Apply template → scheduler job | ✅ |
| Template deployment UI (device selector, variable inputs, dry-run diff) | ✅ |
| `firmware_versions` DB table | ✅ |
| Firmware version check job (RouterOS `/system/package/update`) | ✅ |
| Firmware upgrade job (install + wait for reboot + verify) | ✅ |
| Firmware status badge on device list version column | ✅ |
| Firmware card in device list side panel (check + upgrade button) | ✅ |
| Firmware section on device detail overview tab | ✅ |
| Daily auto-check for all online RouterOS devices | ✅ |

---

## Phase 5 — CAPsMAN & Enterprise ❌

**Goal:** Wireless visibility and org-level management for enterprise use.

| Item | Status |
|---|---|
| CAPsMAN managed APs (`/caps-man/remote-cap`) as sub-devices | ❌ |
| CAPsMAN interface profiles — read-only display | ❌ |
| "Managed APs" tab on CAPsMAN controller device detail | ❌ |
| WireGuard peer management (list, add, QR export) | ❌ |
| IPsec status display | ❌ |
| OVPN server status + connected clients | ❌ |
| VPN tab on device detail | ❌ |
| User management UI (invite, disable, reset password) | ❌ |
| Role CRUD UI with permission picker | ❌ |
| API key management (long-lived tokens) | ❌ |
| Multi-site executive dashboard (all-sites health summary) | ❌ |
| Global client search (cross-site MAC/IP/hostname) | ❌ |

---

## UI & Styling Conventions

- **Scoped styles** stay in the component `<style>` block — never leak utility classes globally.
- **Global styles** live in `app.scss` only (typography scale, colour tokens, layout primitives).
- **Component overrides** via CSS custom properties — override the relevant `--color-*` variable locally, never hardcode hex values.
- **Light & dark mode required** on every new component — all colours must use existing CSS variable tokens.
- **Interactive states** — all clickable/focusable elements must define `:hover`, `:focus-visible`, and `:active` using CSS variables.

---

## Cross-Cutting Conventions

- All new API endpoints go under `/api/v1/services/` using the existing dynamic service routing pattern.
- All new data is pushed via the existing WebSocket broadcast infrastructure (`/ws/controller`).
- New WebSocket event namespaces: `metric.updated`, `client.updated`, `alert.fired`, `alert.resolved`, `topology.updated`.
- Unit tests via Vitest for: alert condition evaluator, template renderer, metric retention.
