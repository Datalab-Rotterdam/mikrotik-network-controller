# Market Research & Product Direction

## Target Audience

MSP operators and network engineers managing MikroTik-focused networks. Primary competition: Dude (MikroTik's own tool), LibreNMS, PRTG, and UniFi (for non-MikroTik hardware). Key differentiator: first-class MikroTik support with MSP-grade multi-site isolation.

## Phase 1 — Table Stakes

Features required before any paid deployment:

- **Device management** — adopt, inventory, configure, and monitor from one place
- **Real-time monitoring and alerts** — uptime, CPU, memory, temperature, throughput, events
- **Zero-touch provisioning** — devices come online and receive config with minimal manual steps
- **Firewall and VLAN visibility** — core network configuration represented cleanly and safely (read-only sync Phase 1; write paths Phase 2+)
- **Multi-site support** — data boundaries explicit; no single-customer assumptions
- **Firmware management** — version check, bulk scheduling, upgrade with rollback
- **User and role management** — admin vs read-only at minimum; RBAC foundation for multi-tenant

## MSP Readiness Constraints (Phase 1)

Even before full multi-tenancy:
- Explicit site/client data boundaries in all schemas and services
- No global state that assumes a single network
- Designs that can evolve to tenant isolation without rewrites

## Phase 2+ Opportunities

- Write-path firewall/VLAN management (push rules to devices)
- CAPsMAN managed AP visibility
- WireGuard/IPsec/OVPN status
- Multi-site executive dashboard
- API key management for integrations
- Global cross-site client search
