# MikroTik Router Provisioning Script

This document explains what script you need to run on your MikroTik router to enable remote management for the Network Controller.

## Quick Start

For managed provisioning, the preferred flow is controller-driven adoption from an MNDP-discovered RouterOS device:

1. Open the discovered router from the Devices page.
2. Enter the initial RouterOS API credentials, for example the factory or lab credentials.
3. Optionally set Management CIDRs in Advanced settings.
4. Click Adopt.

The controller uses those credentials once to create its managed access, stores only generated controller credentials, and automatically schedules provisioning. The initial password is not stored.

The script-based bootstrap flow is still available as a fallback. Both managed flows create the credentials the controller needs:

- a generated controller SSH key pair in `.data/controller_ssh` and `.data/controller_ssh.pub`
- an `mt-managed` RouterOS user that trusts the controller public key
- a random `controller-rest` REST password that is acknowledged back to the controller

For the fallback script flow, prepare the bootstrap script from the device adoption panel, approve the discovered device, then run the generated RouterOS script on the router. The `/bootstrap/controller.pub` endpoint generates the controller key pair automatically if it does not exist yet.

For a local lab router, the current test target is:

```text
Host: 192.168.1.156
Username: admin
Password: admin
```

If your router is **brand new** and accessible via WinBox/SSH, this older minimal script enables basic read-only adoption:

```routeros
/ip service
set api disabled=no
set api-ssl disabled=no

/ip firewall filter
add chain=input protocol=tcp dst-port=8728 action=accept
add chain=input protocol=tcp dst-port=22 action=accept

/user add name="controller" password="your-password" group=read

/log info "Provisioning complete"
```

## What This Script Does

The legacy provisioning script enables:

1. **API Service** - Allows the controller to connect via RouterOS API (port 8728)
2. **SSH** - For remote command-line access (port 22)
3. **Firewall Rules** - Allows connections from local network
4. **Read-only User** - Creates a `controller` user for secure access

## How to Apply the Script

### Method 1: Via WinBox (Recommended for beginners)

1. Open WinBox and connect to your router
2. Go to **System > Scripts**
3. Click **+** to add a new script
4. Paste the script content
5. Click **Apply** then **OK**
6. Run the script by clicking the **Run** button

### Method 2: Via SSH/Console

```bash
# Connect to router via SSH
ssh admin@192.168.88.1

# Paste the script
[command mode]
```

### Method 3: Via WebFig

1. Log in to WebFig
2. Go to **System > Scripts**
3. Add and run the script

## Generated Scripts

The controller can generate customized scripts based on your needs:

### RouterOS Script
- Enables API (8728), API-SSL (8729), SSH (22), HTTP (80), HTTPS (443)
- Creates read-only user for controller
- Configures NTP for time sync
- Sets up SNMP for monitoring

### SwitchOS Script  
- Enables API and SSH
- Creates read-only user
- Configures NTP

## After Running the Script

For bootstrap provisioning:

1. The router enrolls with the controller and waits until approved.
2. The router fetches the controller SSH public key and imports it for `mt-managed`.
3. The router creates or updates `controller-rest` with a generated password.
4. The router posts the REST username/password and managed SSH username back to the controller.
5. The controller stores the credentials encrypted and can provision or rotate REST credentials later.

For controller-driven MNDP adoption, these same managed credentials are installed directly over RouterOS API and the provisioning task is queued automatically after credential setup succeeds.

For the legacy script, API service is available on port 8728 and you can adopt with `controller` / `controller-password` unless customized.

## Troubleshooting

**Can't connect via API?**
- Check firewall: `/ip firewall filter print`
- Verify API service: `/ip service print`
- Ensure no conflicting firewall rules
- Controller-driven MNDP adoption requires API/API-SSL to be reachable before adoption starts

**User authentication failed?**
- Verify user exists: `/user print`
- Check user permissions: `/user print detail`

**Router unreachable?**
- Check IP connectivity: `/ping 8.8.8.8`
- Verify interface status: `/interface print`

## Security Recommendations

1. Keep `.data/controller_ssh` private and do not commit it.
2. Set a strong `CONTROLLER_SECRET` before storing production credentials.
3. Restrict management CIDRs to the controller network.
4. Use HTTPS/REST for day-to-day controller traffic and SSH only for credential rotation/recovery.
5. Rotate REST credentials after initial adoption.

## Customizing the Script

The controller can generate scripts with custom settings:
- Custom firewall network restrictions
- Custom username/password
- Enable/disable specific services
- SNMP configuration

Use the controller UI to generate a customized script for your router.
