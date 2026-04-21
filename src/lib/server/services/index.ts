export { adoptRouterOsDevice, adoptionEvents } from './adoption.service';
export { loadSiteDeviceState } from './site-device.service';
export type { SiteDeviceState } from './site-device.service';
export {
	generateBootstrapScript,
	generateProvisionScript,
	generateProvisionScriptSwitch,
	PROVISION_SCRIPT,
	PROVISION_SCRIPT_SWITCH
} from './router-provisioning.service';
export { resolveDeviceImage } from './device-image-catalog.service';
