export const PROVISION_SCRIPT = `#!/routeros
# MikroTik Network Controller Provisioning Script
# This script enables remote management and configures the router for controller adoption

# Set system identity to device hostname
/system identity set name=[/system routerboard get serial-number]

# Enable API service for remote management
/ip service
set api disabled=no
set api-ssl disabled=no

# Allow API connections from controller network (adjust as needed)
/ip firewall filter
add chain=input protocol=tcp dst-port=8728 action=accept comment="Allow API from local network"
add chain=input protocol=tcp dst-port=8729 action=accept comment="Allow API SSL from local network"
add chain=input protocol=tcp dst-port=22 action=accept comment="Allow SSH from local network"
add chain=input protocol=tcp dst-port=80 action=accept comment="Allow HTTP from local network"
add chain=input protocol=tcp dst-port=443 action=accept comment="Allow HTTPS from local network"

# Enable NTP client for time synchronization
/ntp client
set enabled=yes primary-ntp=0.pool.ntp.org secondary-ntp=1.pool.ntp.org

# Create read-only user for controller (adjust password as needed)
/user add name="controller" password="controller-password" group=read

# Enable SNMP for monitoring (optional)
/snmp
set enabled=yes contact="Network Admin" location="Data Center"
/snmp community
add name="public" permissions=readonly

# Notify that provisioning is complete
:log info "MikroTik provisioning script completed successfully"
:log info "Router is now ready for controller adoption"
:log info "API service enabled on port 8728"
:log info "Read-only user 'controller' created"
`;

export const PROVISION_SCRIPT_SWITCH = `#!/switchos
# MikroTik SwitchOS Provisioning Script
# This script enables remote management for SwitchOS devices

# Enable HTTP API for remote management
/sys api set enabled=yes

# Enable SSH for remote management
/sys ssh set enabled=yes

# Set system identity
/sys identity set name=[/sys board get serial-number]

# Create read-only user for controller
/user add name="controller" password="controller-password" group=read

# Configure NTP
/sys ntp client set enabled=yes primary-ntp=0.pool.ntp.org

# Save configuration
/sys save name=provisioned

# Notify completion
:log info "SwitchOS provisioning completed"
`;

export interface ProvisionConfig {
	host: string;
	enableHttp?: boolean;
	enableHttps?: boolean;
	enableApi?: boolean;
	enableSsh?: boolean;
	enableSnmp?: boolean;
	createUserController?: boolean;
	controllerUsername?: string;
	controllerPassword?: string;
	allowNetwork?: string;
}

export function generateProvisionScript(config: ProvisionConfig): string {
	const lines: string[] = [
		'#!/routeros',
		'# MikroTik Network Controller Provisioning Script',
		'# Host: ' + (config.host || 'Not specified'),
		'# Generated: ' + new Date().toISOString(),
		'',
		'# Enable API service for remote management',
		'/ip service',
		(config.enableApi !== false ? 'set api disabled=no' : 'set api disabled=yes'),
		(config.enableHttps !== false ? 'set api-ssl disabled=no' : 'set api-ssl disabled=yes'),
		(config.enableHttp ? 'set www disabled=no' : 'set www disabled=yes'),
		(config.enableHttps ? 'set www-ssl disabled=no' : 'set www-ssl disabled=yes'),
		(config.enableSsh !== false ? 'set ssh disabled=no' : 'set ssh disabled=yes'),
		'',
		'# Configure firewall to allow controller connections',
		'/ip firewall filter',
		`add chain=input protocol=tcp dst-port=${config.enableApi !== false ? '8728' : '8728'} action=accept comment="Allow API from ${config.allowNetwork || 'local network'}"`,
		`add chain=input protocol=tcp dst-port=${config.enableHttps !== false ? '8729' : '8729'} action=accept comment="Allow API SSL from ${config.allowNetwork || 'local network'}"`,
		`add chain=input protocol=tcp dst-port=${config.enableSsh !== false ? '22' : '22'} action=accept comment="Allow SSH from ${config.allowNetwork || 'local network'}"`,
		`add chain=input protocol=tcp dst-port=${config.enableHttp ? '80' : '80'} action=accept comment="Allow HTTP from ${config.allowNetwork || 'local network'}"`,
		`add chain=input protocol=tcp dst-port=${config.enableHttps ? '443' : '443'} action=accept comment="Allow HTTPS from ${config.allowNetwork || 'local network'}"`,
		'',
		'# Enable NTP for time synchronization',
		'/ntp client',
		'set enabled=yes primary-ntp=0.pool.ntp.org secondary-ntp=1.pool.ntp.org',
		'',
	];

	if (config.createUserController !== false) {
		lines.push(
			'# Create read-only user for controller',
			`/user add name="${config.controllerUsername || 'controller'}" password="${config.controllerPassword || 'controller-password'}" group=read`,
			''
		);
	}

	if (config.enableSnmp !== false) {
		lines.push(
			'# Enable SNMP for monitoring (optional)',
			'/snmp',
			'set enabled=yes contact="Network Admin" location="Data Center"',
			'/snmp community',
			'add name="public" permissions=readonly',
			''
		);
	}

	lines.push(
		'# Set system identity',
		`/system identity set name="${config.host || 'router'}"`,
		'',
		'# Notification',
		':log info "MikroTik provisioning script completed successfully"',
		':log info "Router is now ready for controller adoption"',
		':log info "API service enabled on port 8728"',
		''
	);

	return lines.filter(Boolean).join('\n');
}

export function generateProvisionScriptSwitch(config: ProvisionConfig): string {
	const lines: string[] = [
		'#!/switchos',
		'# MikroTik SwitchOS Provisioning Script',
		'# Host: ' + (config.host || 'Not specified'),
		'# Generated: ' + new Date().toISOString(),
		'',
		'# Enable API service',
		'/sys api set enabled=yes',
		'',
		'# Enable SSH',
		'/sys ssh set enabled=yes',
		'',
		'# Set system identity',
		`/sys identity set name="${config.host || 'switch'}"`,
		'',
		'# Create read-only user for controller',
		`/user add name="${config.controllerUsername || 'controller'}" password="${config.controllerPassword || 'controller-password'}" group=read`,
		'',
		'# Enable NTP',
		'/sys ntp client set enabled=yes primary-ntp=0.pool.ntp.org',
		'',
		'# Save configuration',
		'/sys save name=provisioned',
		'',
		'# Notification',
		':log info "SwitchOS provisioning completed"',
		''
	];

	return lines.filter(Boolean).join('\n');
}
