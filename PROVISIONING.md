# MikroTik Router Provisioning Script

This document explains what script you need to run on your MikroTik router to enable remote management for the Network Controller.

## Quick Start

If your router is **brand new** and accessible via WinBox/SSH, run this minimal script:

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

The provisioning script enables:

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

1. The router will log: `Provisioning complete`
2. API service will be available on port 8728
3. You can now adopt the router in the controller UI
4. Use credentials: `controller` / `controller-password` (or your custom password)

## Troubleshooting

**Can't connect via API?**
- Check firewall: `/ip firewall filter print`
- Verify API service: `/ip service print`
- Ensure no conflicting firewall rules

**User authentication failed?**
- Verify user exists: `/user print`
- Check user permissions: `/user print detail`

**Router unreachable?**
- Check IP connectivity: `/ping 8.8.8.8`
- Verify interface status: `/interface print`

## Security Recommendations

1. Change the default `controller` password
2. Restrict firewall rules to specific controller IP
3. Use API-SSL (port 8729) for encrypted connections
4. Consider using specific interface bindings

## Customizing the Script

The controller can generate scripts with custom settings:
- Custom firewall network restrictions
- Custom username/password
- Enable/disable specific services
- SNMP configuration

Use the controller UI to generate a customized script for your router.
