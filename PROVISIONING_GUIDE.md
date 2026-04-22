# Router Provisioning Guide

## Overview

The devices.service now uses a database-backed architecture with the mikrotik-client library. This document explains how to provision routers using the updated service.

## API Endpoints

### Public Bootstrap Routes

These are used during the initial device enrollment:

- `POST /api/v1/services/devices/enroll` - Enroll a new device
- `GET /api/v1/services/devices/bootstrap/controller.pub` - Get controller SSH public key
- `POST /api/v1/services/devices/bootstrap/ack` - Acknowledge bootstrap completion

### Public Read Routes

- `GET /api/v1/services/devices` - List all devices
- `GET /api/v1/services/devices/:serial` - Get device details
- `GET /api/v1/services/devices/:serial/stats` - Get runtime stats

## Provisioning Flow

### 1. Controller-Driven Managed Adoption

When MNDP discovers a RouterOS device and the operator knows initial RouterOS API credentials, the controller can perform managed adoption without pasting a script on the device:

1. **Validation**: Controller validates host, RouterOS platform, real API provider, API port, and optional management CIDRs.
2. **Inventory**: Controller logs in with the initial credentials and syncs device inventory.
3. **Controller credential preparation**: Controller creates `.data/controller_ssh` and `.data/controller_ssh.pub` if missing.
4. **Managed credential setup**: Controller creates:
   - `controller-rest-group` with API/REST/read/write policy
   - `controller-rest` with a generated password
   - `mt-managed` with SSH trust for the controller public key
5. **Service setup**: Controller enables SSH, HTTPS, API, and API-SSL, applies management CIDR restrictions when supplied, and disables plain HTTP.
6. **Credential storage**: Controller stores only generated controller credentials and discards the initial password.
7. **Provisioning**: Controller marks the device fully managed and schedules the provisioning task automatically.

RouterOS API remains enabled in this path because the current controller telemetry/provisioning client uses RouterOS API. Disable API only after the controller has a true REST transport for daily operations.

### 2. Bootstrap Script Fallback

The bootstrap script (see `bootstrap-config.routeros`) handles:

1. **Controller credential preparation**: The controller creates `.data/controller_ssh` and `.data/controller_ssh.pub` if they do not already exist.
2. **Enrollment**: Device sends enrollment request with serial, model, identity, version
3. **Approval**: Operator approves device via SvelteKit UI
4. **Key Exchange**: Device fetches controller SSH public key
5. **User Creation**: Bootstrap creates:
   - `mt-managed` SSH user (trust anchor, full permissions)
   - `controller-rest` REST user (operational, limited permissions)
6. **Acknowledgment**: Device sends REST credentials and managed SSH username back to controller

The SSH key pair is generated through `@sourceregistry/node-openssl` and the public key is served in OpenSSH format for RouterOS import. Configure alternative paths with:

```bash
CONTROLLER_SSH_PRIVATE_KEY=/secure/path/controller_ssh
CONTROLLER_SSH_PUBLIC_KEY=/secure/path/controller_ssh.pub
```

### 3. Managed Phase

After bootstrap, use these internal service methods:

#### Via SvelteKit UI (Recommended)

1. Navigate to device list
2. Click "Provision" on a device
3. The form action calls `provisioning.provision(serial)` internally

#### Via Internal Service Call

```typescript
import devicesService from '$lib/server/services/devices.service';

// Provision a device
await devicesService.local.provisioning.provision('device-serial-number');
```

### 4. Credential Rotation

For security, periodically rotate REST credentials:

```typescript
import devicesService from '$lib/server/services/devices.service';

// Rotate REST credentials via SSH
await devicesService.local.credentials.rotateRestSecret('device-serial-number');
```

This:
1. Ensures the controller SSH key pair exists
2. Connects via SSH (using `mt-managed` user)
3. Updates the `controller-rest` user password
4. Updates the database with new credentials
5. Updates device lastSeenAt timestamp

## Lab Router

The available non-production test router can be adopted with:

```text
Host: 192.168.1.156
Username: admin
Password: admin
Platform: RouterOS
```

Use this only for local test runs. Do not reuse these credentials for production devices.

## Database Schema

The service uses these tables:

- `devices` - Device metadata, state, connection info
- `device_credentials` - REST/SSH credentials (encrypted)
- `device_interfaces` - Interface configuration

## Architecture Modules

### Adoption Module
- Manages bootstrap lifecycle
- Handles enrollment, approval, acknowledgment
- Public endpoints only

### Telemetry Module
- Read-only operations
- Lists devices, fetches stats
- Uses RouterOSClient for REST API calls

### Provisioning Module
- Applies configuration to devices
- Uses RouterOSClient for REST API calls
- Internal operations only

### Credentials Module
- Manages credential lifecycle
- Uses RouterOSSshClient for SSH operations
- Internal operations only

## Security Model

```
SSH (root of trust)
   ↓
REST (operational control plane)
   ↓
Bootstrap (one-time setup)
```

- **SSH**: Used for credential rotation and recovery only
- **REST**: Used for daily reads and writes
- **Bootstrap**: One-time initialization, then disabled

## Example: Provision a Device

1. **Bootstrap the device** using `bootstrap-config.routeros`
2. **Approve in UI** - Go to device list and approve
3. **Provision** - Click "Provision" button or call internally

The provisioning default config sets the device identity to `device-{serial}`. To customize:

```typescript
// In provisioning.module.ts, modify the provision function:
await client.execute('/system/identity/set', {
    attributes: {
        '.id': '*1',
        name: `device-${serial}`
    }
});

// Add more config as needed:
await client.execute('/ip/address/add', {
    attributes: {
        address: '192.168.1.1/24',
        interface: 'bridge'
    }
});
```

## Troubleshooting

### Device not appearing in list
- Check database: `SELECT * FROM devices;`
- Verify bootstrap completed successfully
- Check logs for enrollment errors

### Provisioning fails
- Verify REST credentials are valid
- Check device connection status
- Ensure REST user has proper permissions

### SSH connection fails
- Verify SSH key is imported on device
- Check `mt-managed` user exists
- Verify SSH service is enabled

## Migration Notes

If you have existing devices using the old DeviceStore:

1. Export device data from old store
2. Insert into database using `upsertAdoptedDevice()` from `device.repository`
3. Insert credentials into `device_credentials` table
4. Update bootstrap script to use new endpoints

## Files Modified

- `src/lib/server/services/devices.service/shared.ts` - Removed DeviceStore, added DB functions
- `src/lib/server/services/devices.service/modules/*.ts` - Updated to use DB and mikrotik-client
- `src/lib/server/repositories/telemetry.repository.ts` (new) - Database queries

## Next Steps

1. Test bootstrap with a real device
2. Approve device in SvelteKit UI
3. Provision device and verify config is applied
4. Monitor telemetry from device
5. Test credential rotation
