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

export interface BootstrapScriptConfig {
	controllerBaseUrl: string;
	bootstrapToken?: string;
	managementCidrs?: string;
	wwwSslCertificateName?: string;
}

function normalizeControllerBaseUrl(value: string): string {
	return value.replace(/\/+$/, '');
}

export function generateBootstrapScript(config: BootstrapScriptConfig): string {
	return `# =========================
# Bootstrap config
# =========================
:global bsControllerBase "${normalizeControllerBaseUrl(config.controllerBaseUrl)}"
:global bsEnrollUrl ($bsControllerBase . "/api/v1/services/devices/enroll")
:global bsPubKeyUrl ($bsControllerBase . "/api/v1/services/devices/bootstrap/controller.pub")
:global bsAckUrl ($bsControllerBase . "/api/v1/services/devices/bootstrap/ack")

:global bsToken "${config.bootstrapToken ?? ''}"

# Comma-separated CIDR list allowed to access SSH / REST HTTPS on the router
:global bsMgmtCidrs "${config.managementCidrs ?? ''}"

# Existing certificate name on the router for www-ssl
:global bsWwwSslCert "${config.wwwSslCertificateName ?? ''}"

:global bsManagedUser "mt-managed"
:global bsRestGroup "controller-rest-group"
:global bsRestUser "controller-rest"
:global bsRestPassword ""

:global bsJsonEscape do={
    :local s [:tostr $1]
    :while ([:find $s "\\\\" ] != nil) do={
        :local i [:find $s "\\\\"]
        :set s ([:pick $s 0 $i] . "\\\\\\\\" . [:pick $s ($i + 1) [:len $s]])
    }
    :while ([:find $s "\\"" ] != nil) do={
        :local i [:find $s "\\"" ]
        :set s ([:pick $s 0 $i] . "\\\\"" . [:pick $s ($i + 1) [:len $s]])
    }
    :return $s
}

:global bsFileExists do={
    :return ([:len [/file find where name=$1]] > 0)
}

:global bsRandChar do={
    :local chars "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_!@#%+="
    :local idx ([:rndnum from=0 to=73])
    :return [:pick $chars $idx ($idx + 1)]
}

:global bsGeneratePassword do={
    :local out ""
    :for i from=1 to=40 do={
        :set out ($out . [$bsRandChar])
    }
    :return $out
}

:do {
    :local serial [/system routerboard get serial-number]
    :local model [/system resource get board-name]
    :local identity [/system identity get name]
    :local version [/system package update get installed-version]

    :if ([:len $bsRestPassword] = 0) do={
        :set bsRestPassword [$bsGeneratePassword]
    }

    :local eSerial [$bsJsonEscape $serial]
    :local eModel [$bsJsonEscape $model]
    :local eIdentity [$bsJsonEscape $identity]
    :local eVersion [$bsJsonEscape $version]
    :local eToken [$bsJsonEscape $bsToken]

    :local payload ("{\\"serial\\":\\"$eSerial\\",\\"model\\":\\"$eModel\\",\\"identity\\":\\"$eIdentity\\",\\"version\\":\\"$eVersion\\",\\"token\\":\\"$eToken\\"}")

    :local enrollResult [/tool fetch \\
        url=$bsEnrollUrl \\
        http-method=post \\
        http-header-field="Content-Type: application/json" \\
        http-data=$payload \\
        check-certificate=yes \\
        output=user \\
        as-value]

    :local enrollData ($enrollResult->"data")
    :log info ("bootstrap enroll response: " . $enrollData)

    :if ([:find $enrollData "\\"status\\":\\"approved\\""] = nil) do={
        :log warning "bootstrap pending or not approved yet"
        :error "not-approved"
    }

    :if ([:len [/user group find where name=$bsRestGroup]] = 0) do={
        /user group add name=$bsRestGroup policy=rest-api,read,write comment="Managed by bootstrap for external controller"
    }

    :if ([:len [/user find where name=$bsRestUser]] = 0) do={
        :if ([:len $bsMgmtCidrs] > 0) do={
            /user add name=$bsRestUser group=$bsRestGroup password=$bsRestPassword address=$bsMgmtCidrs comment="External controller REST account"
        } else={
            /user add name=$bsRestUser group=$bsRestGroup password=$bsRestPassword comment="External controller REST account"
        }
    } else={
        /user set [find where name=$bsRestUser] group=$bsRestGroup password=$bsRestPassword
        :if ([:len $bsMgmtCidrs] > 0) do={
            /user set [find where name=$bsRestUser] address=$bsMgmtCidrs
        }
    }

    :if ([:len [/user find where name=$bsManagedUser]] = 0) do={
        :if ([:len $bsMgmtCidrs] > 0) do={
            /user add name=$bsManagedUser group=full address=$bsMgmtCidrs comment="External controller SSH trust anchor"
        } else={
            /user add name=$bsManagedUser group=full comment="External controller SSH trust anchor"
        }
    } else={
        /user set [find where name=$bsManagedUser] group=full
        :if ([:len $bsMgmtCidrs] > 0) do={
            /user set [find where name=$bsManagedUser] address=$bsMgmtCidrs
        }
    }

    :local keyFile "controller-managed.pub"

    :if ([$bsFileExists $keyFile]) do={
        /file remove $keyFile
    }

    /tool fetch \\
        url=($bsPubKeyUrl . "?serial=" . $serial . "&token=" . $bsToken) \\
        check-certificate=yes \\
        dst-path=$keyFile

    :delay 2s
    /user ssh-keys import user=$bsManagedUser public-key-file=$keyFile

    /ip service disable [find where name="www"]
    /ip service enable [find where name="www-ssl"]

    :if ([:len $bsWwwSslCert] > 0) do={
        /ip service set [find where name="www-ssl"] certificate=$bsWwwSslCert tls-version=only-1.2
    }

    :if ([:len $bsMgmtCidrs] > 0) do={
        /ip service set [find where name="ssh"] address=$bsMgmtCidrs
        /ip service set [find where name="www-ssl"] address=$bsMgmtCidrs
    }

    :if ([:len [/ip service find where name="api"]] > 0) do={
        /ip service disable [find where name="api"]
    }
    :if ([:len [/ip service find where name="api-ssl"]] > 0) do={
        /ip service disable [find where name="api-ssl"]
    }

    :local eRestUser [$bsJsonEscape $bsRestUser]
    :local eRestPass [$bsJsonEscape $bsRestPassword]
    :local eManagedUser [$bsJsonEscape $bsManagedUser]
    :local ackPayload ("{\\"serial\\":\\"$eSerial\\",\\"restUser\\":\\"$eRestUser\\",\\"restPassword\\":\\"$eRestPass\\",\\"managedUser\\":\\"$eManagedUser\\"}")

    /tool fetch \\
        url=$bsAckUrl \\
        http-method=post \\
        http-header-field="Content-Type: application/json" \\
        http-data=$ackPayload \\
        check-certificate=yes \\
        output=none

    /system scheduler disable [find where name="bootstrap-loop"]
    :log info "bootstrap complete; REST user, SSH user and policies created"
} on-error={
    :log warning "bootstrap failed; scheduler will retry"
}`;
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
