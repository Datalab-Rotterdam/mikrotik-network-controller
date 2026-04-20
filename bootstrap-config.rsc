# =========================
# Bootstrap config
# =========================
:global bsControllerBase "__CONTROLLER_BASE_URL__"
:global bsEnrollUrl ($bsControllerBase . "/api/v1/services/devices/enroll")
:global bsPubKeyUrl ($bsControllerBase . "/api/v1/services/devices/bootstrap/controller.pub")
:global bsAckUrl ($bsControllerBase . "/api/v1/services/devices/bootstrap/ack")

:global bsToken "__BOOTSTRAP_TOKEN__"

# Comma-separated CIDR list allowed to access SSH / REST HTTPS on the router
# Example: "10.10.0.0/16,100.64.0.0/10"
:global bsMgmtCidrs "__MGMT_CIDRS__"

# Existing certificate name on the router for www-ssl
:global bsWwwSslCert "__WWW_SSL_CERT_NAME__"

:global bsManagedUser "mt-managed"
:global bsRestGroup "controller-rest-group"
:global bsRestUser "controller-rest"

# Random strong password for REST user.
# In production, prefer templating this per device from your provisioning system.
:global bsRestPassword ""

# =========================
# Helpers
# =========================
:global bsJsonEscape do={
    :local s [:tostr $1]
    :while ([:find $s "\\" ] != nil) do={
        :local i [:find $s "\\"]
        :set s ([:pick $s 0 $i] . "\\\\" . [:pick $s ($i + 1) [:len $s]])
    }
    :while ([:find $s "\"" ] != nil) do={
        :local i [:find $s "\"" ]
        :set s ([:pick $s 0 $i] . "\\\"" . [:pick $s ($i + 1) [:len $s]])
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

# =========================
# Main
# =========================
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

    :local payload ("{\"serial\":\"$eSerial\",\"model\":\"$eModel\",\"identity\":\"$eIdentity\",\"version\":\"$eVersion\",\"token\":\"$eToken\"}")

    :local enrollResult [/tool fetch \
        url=$bsEnrollUrl \
        http-method=post \
        http-header-field="Content-Type: application/json" \
        http-data=$payload \
        check-certificate=yes \
        output=user \
        as-value]

    :local enrollData ($enrollResult->"data")
    :log info ("bootstrap enroll response: " . $enrollData)

    :if ([:find $enrollData "\"status\":\"approved\""] = nil) do={
        :log warning "bootstrap pending or not approved yet"
        :error "not-approved"
    }

    # =========================
    # Create custom REST group
    # Policies:
    # - rest-api: allow REST login
    # - read: allow reads
    # - write: allow config changes
    # No policy right => no user/group management via REST
    # =========================
    :if ([:len [/user group find where name=$bsRestGroup]] = 0) do={
        /user group add name=$bsRestGroup policy=rest-api,read,write comment="Managed by bootstrap for external controller"
    }

    # =========================
    # Create / update REST user
    # Restrict login source if management CIDRs are supplied
    # =========================
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

    # =========================
    # Create managed SSH user
    # Keep full rights here as trust anchor / recovery path
    # =========================
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

    # =========================
    # Download and import controller SSH public key
    # =========================
    :local keyFile "controller-managed.pub"

    :if ([$bsFileExists $keyFile]) do={
        /file remove $keyFile
    }

    /tool fetch \
        url=($bsPubKeyUrl . "?serial=" . $serial . "&token=" . $bsToken) \
        check-certificate=yes \
        dst-path=$keyFile

    :delay 2s

    /user ssh-keys import user=$bsManagedUser public-key-file=$keyFile

    # =========================
    # Service hardening
    # - Disable plain HTTP WebFig
    # - Enable HTTPS WebFig
    # - Restrict SSH and www-ssl to management CIDRs when supplied
    # - Pin certificate and TLS version for www-ssl if desired
    # =========================
    /ip service disable [find where name="www"]
    /ip service enable [find where name="www-ssl"]

    :if ([:len $bsWwwSslCert] > 0) do={
        /ip service set [find where name="www-ssl"] certificate=$bsWwwSslCert tls-version=only-1.2
    }

    :if ([:len $bsMgmtCidrs] > 0) do={
        /ip service set [find where name="ssh"] address=$bsMgmtCidrs
        /ip service set [find where name="www-ssl"] address=$bsMgmtCidrs
    }

    # Optional: disable API listeners if you only want REST over WebFig HTTPS
    :if ([:len [/ip service find where name="api"]] > 0) do={
        /ip service disable [find where name="api"]
    }
    :if ([:len [/ip service find where name="api-ssl"]] > 0) do={
        /ip service disable [find where name="api-ssl"]
    }

    # =========================
    # Acknowledge back to controller
    # =========================
    :local eRestUser [$bsJsonEscape $bsRestUser]
    :local eRestPass [$bsJsonEscape $bsRestPassword]
    :local eManagedUser [$bsJsonEscape $bsManagedUser]
    :local ackPayload ("{\"serial\":\"$eSerial\",\"restUser\":\"$eRestUser\",\"restPassword\":\"$eRestPass\",\"managedUser\":\"$eManagedUser\"}")

    /tool fetch \
        url=$bsAckUrl \
        http-method=post \
        http-header-field="Content-Type: application/json" \
        http-data=$ackPayload \
        check-certificate=yes \
        output=none

    # =========================
    # Disable bootstrap scheduler after success
    # =========================
    /system scheduler disable [find where name="bootstrap-loop"]

    :log info "bootstrap complete; REST user, SSH user and policies created"
} on-error={
    :log warning "bootstrap failed; scheduler will retry"
}
