# MikroTik Network Controller

> Work in progress: this repository is in the planning and early development phase. The README describes the intended product direction, feature scope, and staged roadmap. Features listed here should not be assumed to be implemented yet.

Local-first network controller for MikroTik routers, switches, and wireless devices.

The goal is to create a controller experience similar in spirit to the UniFi Network Controller, but designed for MikroTik environments and without relying on cloud services. All configuration, telemetry, credentials, backups, logs, and analytics must stay on infrastructure controlled by the operator.

## Product Vision

MikroTik devices are powerful, flexible, and cost-effective, but managing multiple RouterOS devices at scale often requires direct device access, scripts, spreadsheets, and manual coordination. This project aims to provide a single local controller that can discover, monitor, configure, back up, and maintain MikroTik networks from one interface.

The controller should make common network operations easier while preserving MikroTik's advanced capabilities. It should not hide RouterOS completely; instead, it should provide safe workflows, reusable templates, visibility, and automation around it.

## Core Principles

- Local-first by design: no required cloud account, hosted backend, external telemetry, or vendor-hosted dependency.
- Data stays local: device credentials, configuration backups, metrics, client history, and logs remain in the local deployment.
- Operator controlled: the user decides where the controller runs, how it is backed up, and who can access it.
- Secure defaults: encrypted secrets, role-based access, audit logs, and explicit change previews.
- RouterOS native: use official MikroTik capabilities where possible, including RouterOS API, SSH, exports, backups, CAPsMAN, WireGuard, VLANs, firewall rules, DHCP, DNS, and system packages.
- Incremental adoption: existing MikroTik networks should be onboarded without factory resetting devices.
- Reversible changes: planned changes should be previewed, logged, backed up, and recoverable.

## Target Users

- Small and medium organizations running multiple MikroTik devices.
- Managed service providers that need repeatable local deployments per customer.
- Municipal, education, lab, and industrial networks that cannot depend on external cloud control.
- Advanced home lab users who want a clean controller interface without giving up RouterOS flexibility.

## Feature List

### Device Management

- Discover MikroTik devices on local networks.
- Add devices manually by IP address, DNS name, or subnet scan.
- Adopt devices into controller management without requiring a factory reset.
- Support read-only adoption first, then optionally promote devices to managed mode.
- Keep existing RouterOS configuration intact during adoption.
- Store device identity, model, serial number, RouterOS version, architecture, uptime, and capabilities.
- Group devices by site, role, location, rack, or custom tags.
- Show device health, reachability, CPU, memory, storage, temperature, voltage, fan status, and interface state.
- Support RouterOS API and SSH based communication.
- Track device connection status and last successful synchronization.

### Device Adoption

- Make adoption a first-phase workflow, not a later configuration feature.
- Discover adoptable devices by subnet scan, manual IP or DNS entry, and known-neighbor information where available.
- Validate credentials and required RouterOS services before adoption.
- Start with read-only adoption so the controller can inventory, monitor, and back up the device safely.
- Create a configuration export immediately after adoption as the initial restore point.
- Detect whether the device is already managed by this controller, unmanaged, unreachable, credential-invalid, or blocked by firewall/service settings.
- Allow operators to assign adopted devices to a site, role, tags, and management policy.
- Show adoption progress with clear states: discovered, credentials verified, inventoried, backed up, monitored, and fully managed.
- Provide an optional managed-mode promotion step for controller-driven configuration changes.
- Avoid overwriting existing configuration during adoption unless the operator explicitly applies a reviewed change.

### Topology and Inventory

- Build a network topology view from LLDP, CDP where available, bridge hosts, ARP, MAC tables, interface data, and configured links.
- Display routers, switches, access points, clients, VLANs, trunks, uplinks, and WAN connections.
- Maintain inventory for devices, interfaces, IP addresses, subnets, DHCP pools, wireless radios, SSIDs, and clients.
- Detect unknown devices, duplicate IP addresses, interface flaps, and topology changes.

### Monitoring and Alerts

- Collect local metrics from RouterOS devices.
- Show dashboards for sites, devices, WAN links, wireless performance, clients, and traffic.
- Track latency, packet loss, interface throughput, error counters, CPU load, memory, disk usage, DHCP lease usage, wireless registration quality, and VPN tunnel status.
- Alert on outages, high resource usage, interface down events, WAN failover, rogue DHCP servers, config drift, low disk space, and outdated RouterOS versions.
- Provide local notifications by email, webhook, syslog, or other self-hosted integrations.

### Configuration Management

- Read and normalize key RouterOS configuration areas.
- Provide guided configuration for common workflows:
  - WAN, LAN, and management networks
  - VLANs and bridge ports
  - DHCP servers and pools
  - DNS forwarding
  - Firewall filter rules
  - NAT
  - WireGuard VPN
  - CAPsMAN wireless
  - SSIDs and security profiles
  - Static routes
  - NTP
  - System users
  - Logging and syslog
- Preview configuration changes before applying them.
- Apply changes to one device, a group of devices, or an entire site.
- Record every change in an audit log with user, timestamp, target device, diff, and result.
- Detect configuration drift from expected templates.

### Templates and Policies

- Create reusable site templates.
- Create device role templates, such as edge router, core switch, access switch, access point, VPN gateway, or lab router.
- Manage network objects such as VLANs, subnets, address lists, firewall groups, and service definitions.
- Support inheritance from organization defaults to site defaults to device overrides.
- Validate templates before deployment.
- Support staged rollout and rollback plans.

### Backup and Restore

- Schedule automatic RouterOS export and binary backup collection.
- Store backups locally with retention policies.
- Encrypt backups at rest.
- Compare configuration exports over time.
- Restore known-good configurations.
- Download per-device backup bundles.
- Mark backup restore points before controller-driven changes.

### Firmware and Package Management

- Track RouterOS and firmware versions.
- Show available updates after locally checking configured MikroTik package sources.
- Stage updates by site, role, or device.
- Run preflight checks before upgrade.
- Create backups before upgrade.
- Monitor reboot and post-upgrade recovery.
- Report failed or partial upgrades.

### Wireless Management

- Manage CAPsMAN based access point deployments.
- Configure SSIDs, security profiles, channels, datapaths, VLAN assignment, roaming behavior, and access lists.
- Show AP health, connected stations, signal quality, retries, channel usage, noise floor, and registration history.
- Detect weak clients, overloaded access points, and channel conflicts.
- Support both centrally managed and standalone wireless devices where possible.

### Client and Service Visibility

- Show active and historical clients from DHCP leases, ARP tables, bridge host tables, wireless registrations, and accounting sources.
- Track client identity, IP address, MAC address, hostname, vendor, connected device, interface, SSID, VLAN, traffic, and last seen time.
- Search clients across all sites.
- Identify blocked, unknown, static, and roaming clients.
- Provide per-client troubleshooting views.

### Security and Access Control

- Local user accounts.
- Role-based access control.
- Optional integration with local identity providers where practical.
- Encrypted device credentials.
- Audit logging for login events, device access, configuration changes, backup downloads, and administrative actions.
- Session management and optional multi-factor authentication.
- Principle-of-least-privilege device access guidance.

### Local Deployment and Operations

- Run as a self-hosted application.
- Support Docker or container-based deployment.
- Support single-node installation for small networks.
- Support external local databases for larger installations.
- Provide backup and restore for the controller itself.
- Offer health checks, logs, and diagnostics for the controller service.

## Non-Goals

- No mandatory cloud account.
- No required hosted relay service.
- No external telemetry by default.
- No vendor lock-in around hosted storage.
- No forced device adoption workflow that requires resetting working devices.
- No attempt to replace every advanced RouterOS feature in the first releases.

## Suggested Architecture

### Controller Application

- Web application for dashboard, inventory, topology, configuration, backups, and administration.
- Backend service responsible for device communication, job scheduling, data storage, and audit logging.
- Worker queue for discovery, polling, synchronization, backups, updates, and config deployments.

### Device Communication

- RouterOS API for structured reads and writes.
- SSH for exports, diagnostics, fallback commands, and compatibility workflows.
- ICMP and TCP checks for reachability.
- SNMP may be added for metrics where it provides value, but it should not be the only integration method.

### Data Storage

- Local relational database for inventory, users, sites, configuration state, jobs, and audit logs.
- Time-series storage or optimized metric tables for monitoring data.
- Local encrypted file storage for backups and exports.

### Security Model

- Encrypt secrets before storing them.
- Separate application users from device credentials.
- Keep all controller state within the local deployment.
- Log all privileged actions.
- Prefer read-only device credentials for discovery and monitoring where possible.
- Use elevated credentials only for explicit configuration actions.

## Delivery Plan

### Stage 0: Foundation

Goal: establish the technical base and product boundaries.

- Define supported RouterOS versions.
- Choose primary device access method and client library.
- Define local-only data handling rules.
- Set up application structure, database, authentication foundation, and job runner.
- Create initial domain model for organizations, sites, devices, interfaces, clients, jobs, users, roles, and audit events.
- Add development and deployment documentation.

Exit criteria:

- Controller can run locally.
- Database migrations are in place.
- Basic login exists.
- Background jobs can be scheduled and observed.

### Stage 1: Discovery and Inventory

Goal: make device discovery and adoption reliable enough to onboard real MikroTik networks early.

- Add subnet scan and manual device adoption.
- Add adoption flow with device discovery, credential validation, site assignment, role assignment, tagging, initial sync, and first backup.
- Support read-only adoption as the default first step.
- Connect to devices using RouterOS API, with SSH available for exports and diagnostics.
- Read identity, version, resources, interfaces, addresses, routes, bridges, VLANs, DHCP leases, and wireless registrations.
- Store synchronized inventory locally.
- Create an initial configuration export immediately after adoption.
- Show device list, device detail page, and site overview.
- Add adoption state, connection status, and sync history.

Exit criteria:

- A user can adopt existing MikroTik devices without resetting them or overwriting their current configuration.
- Adopted devices are assigned to a site and visible in inventory.
- The controller creates a first restore point during adoption.
- The controller shows accurate device inventory and basic health.
- Adoption and sync failures are visible and diagnosable.

### Stage 2: Monitoring Dashboard

Goal: provide useful day-to-day visibility.

- Add periodic polling for health and interface metrics.
- Add site dashboard with device status, WAN status, alerts, and recent events.
- Add interface traffic graphs and basic client views.
- Add alert rules for offline devices, high CPU, high memory, interface down, WAN down, and low storage.
- Add local email or webhook notifications.

Exit criteria:

- Operators can see whether the network is healthy from one dashboard.
- Critical failures generate local notifications.
- Metrics are retained locally with a configurable retention policy.

### Stage 3: Backup and Audit

Goal: make controller-driven operations safer.

- Add scheduled RouterOS exports.
- Add optional binary backups.
- Encrypt stored backups.
- Add backup retention settings.
- Add configuration history view.
- Add audit log for user actions and device operations.
- Create restore point automatically before any write operation.

Exit criteria:

- Every managed device has recent backups.
- Operators can compare configuration history.
- Administrative actions are traceable.

### Stage 4: Read-Only Configuration Views

Goal: expose current RouterOS configuration in understandable controller views.

- Normalize and display firewall, NAT, VLAN, bridge, DHCP, DNS, routes, WireGuard, users, services, logging, and wireless settings.
- Highlight risky settings such as open management services, weak firewall exposure, disabled updates, or missing backups.
- Detect configuration drift between similar devices.
- Add export download from the UI.

Exit criteria:

- Operators can inspect important configuration areas without opening WinBox or terminal.
- The controller can identify obvious misconfiguration and drift.

### Stage 5: Safe Configuration Changes

Goal: allow controlled write operations for common tasks.

- Add change preview before applying configuration.
- Add apply jobs with progress and per-device result reporting.
- Add rollback guidance using restore points.
- Start with low-risk workflows:
  - Device identity and notes
  - NTP settings
  - DNS forwarding settings
  - DHCP lease comments and static leases
  - Address lists
  - Interface comments
  - Basic service enable/disable
- Expand to VLANs, DHCP scopes, firewall rules, NAT, and WireGuard after validation.

Exit criteria:

- Users can safely apply common changes from the controller.
- Every change is previewed, backed up, executed, and audited.
- Failed changes are visible and recoverable.

### Stage 6: Templates and Site Rollout

Goal: make repeatable network design possible.

- Add site templates.
- Add device role templates.
- Add reusable objects for VLANs, subnets, firewall groups, DNS servers, NTP servers, and management access.
- Add validation before deployment.
- Add staged rollout to selected devices.
- Add drift detection against assigned templates.

Exit criteria:

- A new site can be modeled once and applied consistently.
- Operators can see where devices differ from intended configuration.
- Template changes can be rolled out gradually.

### Stage 7: Wireless and CAPsMAN

Goal: provide strong wireless management for MikroTik deployments.

- Read and display CAPsMAN configuration.
- Manage SSIDs, security profiles, datapaths, provisioning rules, and channel plans.
- Show AP and station health.
- Add wireless performance views and client roaming history.
- Detect weak signal, high retries, overloaded APs, and channel conflicts.

Exit criteria:

- Wireless networks can be monitored and managed from the controller.
- Operators can troubleshoot client and AP issues quickly.

### Stage 8: Firmware and Lifecycle Management

Goal: safely manage RouterOS versions across fleets.

- Track RouterOS and firmware versions.
- Add update eligibility checks.
- Add pre-upgrade backup and health checks.
- Support staged upgrades by site, role, or selected devices.
- Monitor reboot and recovery.
- Record update history.

Exit criteria:

- Operators can plan and execute controlled RouterOS upgrades.
- Failed upgrades are reported clearly.
- Version drift is visible across the fleet.

### Stage 9: Multi-Site Operations

Goal: support larger local-first deployments.

- Add multi-site dashboard.
- Add global search for devices, clients, IPs, MAC addresses, VLANs, and configuration objects.
- Add stronger RBAC with per-site permissions.
- Add controller backup and restore.
- Add import and export for sites and templates.
- Add deployment hardening documentation.

Exit criteria:

- The controller works well for multiple sites and multiple operators.
- Access can be scoped per user or team.
- Controller state can be backed up and restored locally.

## MVP Scope

The first usable MVP should include:

- Local login.
- Manual device adoption.
- Subnet-based discovery of adoptable devices.
- Read-only adoption mode.
- RouterOS API connection.
- Device inventory.
- Interface and resource monitoring.
- Initial configuration export during adoption.
- Client visibility from DHCP, ARP, bridge host, and wireless registration data.
- Scheduled configuration exports.
- Local backup retention.
- Basic alerts.
- Audit log.

The MVP should avoid complex write operations until read-only discovery, monitoring, backups, and audit logging are reliable.

## Open Questions

- Which RouterOS versions should be officially supported first?
- Should the first release target RouterOS v7 only, or include v6 compatibility?
- Which database should be used for the local controller?
- Should metrics be stored in the main database or a dedicated local time-series store?
- What is the preferred deployment target: Docker Compose, single binary, Node service, or packaged installer?
- Should SNMP be required, optional, or avoided initially?
- How much CAPsMAN support should be included in the first production release?
- What restore workflow is acceptable for high-risk configuration changes?

## Development

Install dependencies:

```sh
npm install
```

Configure local environment:

```sh
cp .env.example .env
```

Start the local PostgreSQL server:

```sh
docker compose up -d postgres
```

Generate and run database migrations:

```sh
npm run db:generate
npm run db:migrate
```

Start the development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```
