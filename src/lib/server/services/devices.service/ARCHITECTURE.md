# Devices service: purpose, boundaries, and intended operation

The `devices` service is the controller-facing backend domain for managing network devices through a single service gateway in SvelteKit. It is intended to expose only the minimal public endpoints needed for bootstrap and read access, while keeping sensitive operator actions as internal service calls. This matches the purpose of `@sourceregistry/sveltekit-service-manager`: a versioned service gateway for SvelteKit with modular services, internal calls without HTTP hops, and service-local routers. ([GitHub][1])

## Primary function

The service is responsible for the lifecycle of a managed device from first contact to managed operation:

1. the device enrolls with the controller,
2. the controller tracks lifecycle state,
3. bootstrap trust is completed,
4. operational credentials are stored,
5. provisioning is executed,
6. telemetry is read from the device.

This service is the single domain boundary for device management. It is not intended to be split into separate externally exposed services for adoption, provisioning, telemetry, and credentials at this stage, because those capabilities are tightly coupled in one device lifecycle.

## Public API responsibility

The public HTTP surface should stay small and easy to understand.

### Public bootstrap routes

These exist for devices themselves:

* `POST /api/v1/services/devices/enroll`
* `GET /api/v1/services/devices/bootstrap/controller.pub`
* `POST /api/v1/services/devices/bootstrap/ack`

### Public read routes

These exist for dashboards, debugging, and safe external reads:

* `GET /api/v1/services/devices`
* `GET /api/v1/services/devices/:serial`
* `GET /api/v1/services/devices/:serial/stats`

These are the only routes that should be publicly exposed by the service.

## Internal-only responsibility

Sensitive actions should not be exposed as raw public API routes when SvelteKit already handles them via authenticated form actions.

These should stay internal:

* `adoption.adopt(serial)`
* `provisioning.provision(serial)`
* `credentials.rotateRestSecret(serial)`

That means operator actions flow through SvelteKit form actions or server logic, then call the service internally, instead of exposing extra public mutation endpoints.

## Internal module boundaries

The service is internally split into four modules. These are application modules, not separate external services.

### Adoption

Owns bootstrap and lifecycle entry.

Responsibilities:

* process `/enroll`
* serve `/bootstrap/controller.pub`
* process `/bootstrap/ack`
* approve a pending device
* manage early lifecycle state transitions such as `pending -> approved -> managed`

This module owns “bringing a device under management.”

### Telemetry

Owns reads only.

Responsibilities:

* list devices
* fetch one device
* fetch runtime stats
* read operational state from MikroTik via REST

This module must not perform mutations.

### Provisioning

Owns configuration changes.

Responsibilities:

* apply desired state to a device
* push config over MikroTik REST
* orchestrate provisioning steps

This module must not manage secrets or bootstrap.

### Credentials

Owns access and secret lifecycle.

Responsibilities:

* rotate the REST credential
* use SSH as the trust anchor or recovery path
* manage secure access lifecycle

This module must not provision network config or own telemetry.

## Service boundaries

The `devices` service owns:

* device enrollment,
* device lifecycle state,
* bootstrap completion,
* REST credential storage,
* provisioning orchestration,
* telemetry reads.

The `devices` service does **not** own:

* UI rendering,
* user/session authentication,
* SvelteKit form validation policy,
* generic secret vaulting for the whole platform,
* unrelated infrastructure orchestration outside device management.

If those concerns exist, they belong elsewhere in the controller application.

## Security model

The intended trust model is:

* SSH is the primary secure channel and recovery path.
* REST is the operational control plane for reads and writes.
* The bootstrap script prepares the management plane, then stops.
* The controller uses internal operator actions for approval, provisioning, and credential rotation.

In practice, the controller should use SSH only for trust-anchor tasks such as recovery and REST-secret rotation, while normal reads and writes happen over REST because REST returns structured JSON. RouterOS REST is a JSON wrapper around the console/API, while the package design you are using is meant to support both public gateway calls and internal non-HTTP calls cleanly. ([GitHub][1])

## Internal libraries used by this service

The service should depend on a small shared internal layer.

### `shared`

Purpose:

* source of truth for device records
* tracks state, credentials, timestamps, and identity

Used by:

* adoption
* telemetry
* provisioning
* credentials

### `shared`

Purpose:

* shared DTOs and domain types
* examples: `DeviceRecord`, `EnrollInput`, `AckInput`, `DeviceState`

Used by:

* all modules

### `uses the mikrotik-client library`

Purpose:

* low-level adapter for RouterOS REST
* used for telemetry reads and provisioning writes

Used by:

* telemetry
* provisioning

### `uses the mikrotik-client library`

Purpose:

* low-level SSH adapter
* used only for secure trust/recovery tasks such as rotating REST credentials

Used by:

* credentials

## Intended call flow

### Device bootstrap flow

1. Router calls `POST /enroll`
2. Service records or updates the device as pending
3. Operator approves internally via SvelteKit form action
4. Router retrieves the controller SSH public key
5. Router posts bootstrap acknowledgment
6. Service stores resulting access data and marks the device managed

### Operator flow

1. Operator uses the SvelteKit UI
2. Form action calls the service internally
3. Internal module performs adopt, provision, or credential rotation
4. UI reflects updated device state

### Read flow

1. UI or tooling calls read endpoints
2. Telemetry module returns device list, device details, or runtime stats

## Design rules

Keep these rules strict:

* Public routes must be minimal.
* Internal modules must each have one clear responsibility.
* Telemetry must remain read-only.
* Provisioning must not manage secrets.
* Credentials must not own config rollout.
* Adoption must not provision the device directly.
* Shared state must live in one device store.

## Summary

The `devices` service is a single bounded service for the full device lifecycle. It exposes only bootstrap and read endpoints publicly, while keeping approval, provisioning, and credential rotation internal to the SvelteKit controller. It uses `@sourceregistry/sveltekit-service-manager` as the service gateway and internal call boundary, plus shared internal adapters for device storage, MikroTik REST, and MikroTik SSH. ([GitHub][1])

If you want, I can turn this into an `ARCHITECTURE.md` file in a cleaner repository-ready format.

[1]: https://github.com/SourceRegistry/sveltekit-service-manager?utm_source=chatgpt.com "SourceRegistry/sveltekit-service-manager"
