# Security Model

## Overview

This system manages MikroTik devices through a centralized controller using a layered trust model:

> **Bootstrap prepares access → SSH establishes trust → REST handles operations**

The design minimizes attack surface, separates responsibilities, and ensures recovery is always possible.

---

# Core Principles

1. **Least privilege by default**
2. **Single source of truth (controller)**
3. **Separation of trust and operations**
4. **No persistent agent on the router**
5. **Recovery path always available**

---

# Trust Hierarchy

```text
SSH (root of trust)
   ↓
REST (operational control plane)
   ↓
Bootstrap (one-time setup)
```

---

# Bootstrap Phase

## Purpose

The bootstrap script is a **one-time initialization mechanism** that brings a router under controller management.

## Responsibilities

* Enroll with controller
* Create management users and groups
* Install controller SSH public key
* Configure management services
* Return credentials to controller
* Disable itself after success

## Explicit Non-Goals

The bootstrap script **must NOT**:

* Configure networking (VLANs, bridges, routing)
* Apply firewall policies
* Act as a persistent agent
* Perform telemetry or monitoring

---

# Router Access Model

## 1. SSH (Primary Trust Channel)

### User: `mt-managed`

**Purpose**

* Root of trust
* Recovery access
* Credential rotation
* Emergency operations

**Authentication**

* SSH key only

**Permissions**

* Initially `full`

**Usage**

* Install or repair REST credentials
* Recover broken access
* Perform break-glass operations

**Not used for**

* Normal reads
* Normal provisioning

---

## 2. REST (Operational Control Plane)

### User: `controller-rest`

**Purpose**

* Daily controller operations

**Authentication**

* HTTP Basic Auth over HTTPS (`www-ssl`)

**Permissions (custom group)**

```text
rest-api
read
write
```

**Explicitly excluded**

```text
policy
```

### Why no `policy`

* Prevents REST from managing users/groups
* Keeps credential lifecycle under SSH control
* Reduces blast radius if REST credentials are compromised

---

## Why REST is used

* Returns structured JSON
* Simpler for controller logic
* Supports full CRUD operations

---

# RouterOS Permission Model

## Custom REST Group

Example:

```routeros
/user group add name=controller-rest-group policy=rest-api,read,write
```

## REST User

```routeros
/user add name=controller-rest group=controller-rest-group password=...
```

## SSH User

```routeros
/user add name=mt-managed group=full
/user ssh-keys import user=mt-managed public-key-file=...
```

---

# Service Exposure

## Enabled

* `ssh`
* `www-ssl`

## Disabled

* `www`
* `api`
* `api-ssl` (optional)

## Restrictions

Both SSH and HTTPS must be limited to management networks:

```routeros
/ip service set ssh address=10.0.0.0/8
/ip service set www-ssl address=10.0.0.0/8
```

---

# Controller Responsibilities

## Controller owns:

* Device lifecycle state
* REST credentials
* SSH key management
* Provisioning logic
* Telemetry collection

## Controller does NOT rely on:

* Persistent router agents
* Router-side logic beyond bootstrap

---

# Operational Flow

## 1. Bootstrap

```text
Router → POST /enroll
Controller → pending

Operator → approve

Router:
  → fetch SSH key
  → create users/groups
  → POST /bootstrap/ack
```

---

## 2. Managed State

```text
Controller → REST → reads & writes
Controller → SSH → recovery & credential rotation
```

---

## 3. Credential Rotation

```text
Controller → SSH → update REST password
Controller → update internal store
```

---

# Security Boundaries

## SSH

Allowed:

* credential rotation
* recovery
* trust establishment

Not allowed:

* normal telemetry
* standard provisioning

---

## REST

Allowed:

* reads (telemetry)
* writes (provisioning)

Not allowed:

* user management
* trust establishment

---

## Bootstrap Script

Allowed:

* initial setup only

Not allowed:

* long-term execution
* configuration management

---

# Threat Model Considerations

## If REST credentials are compromised

Attacker can:

* read device state
* modify configuration

Attacker cannot:

* create users
* escalate privileges
* break SSH trust

Recovery:

* rotate credentials via SSH

---

## If SSH key is compromised

Attacker can:

* fully control the device

Mitigation:

* rotate SSH keys
* restrict SSH access to management network
* monitor access

---

## If bootstrap token is leaked

Impact:

* unauthorized enrollment attempts

Mitigation:

* validate enrollment server-side
* require approval before management access

---

# Design Decisions

## Why no agent on the router

* Reduces attack surface
* Avoids lifecycle management complexity
* Keeps router stateless

## Why REST for operations

* Structured data
* Easier integration
* Better controller-side logic

## Why SSH for trust

* Strong authentication (keys)
* Independent recovery path
* Not dependent on REST credentials

---

# Summary

The system enforces a strict separation:

* **Bootstrap** → one-time initialization
* **SSH** → trust and recovery
* **REST** → daily operations

This ensures:

* minimal exposed surface
* clear responsibility boundaries
* reliable recovery path
* scalable controller design
