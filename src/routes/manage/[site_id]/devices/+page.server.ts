import { fail, redirect, type Actions } from '@sveltejs/kit';
import { findSiteById } from '$lib/server/repositories/site.repository';
import { service as devicesService } from '$lib/server/services/devices.service';
import { loadSiteDeviceState } from '$lib/server/services/site-device.service';
import { provisionDeviceAction, removeDeviceAction } from './device-actions.server';
import { getFirmwareVersionsForDevices } from '$lib/server/repositories/firmware.repository';
import { createFirmwareCheckTask, createFirmwareUpgradeTask } from '$lib/server/services/firmware.service';
import { Service } from '@sourceregistry/sveltekit-service-manager';
import { enhance } from "@sourceregistry/sveltekit-enhance";

export const actions: Actions = {
	adopt: enhance.action(async ({ request, locals, params, url }) => {
		if (!locals.user) {
			throw redirect(303, '/manage/account/login');
		}

		const site = await findSiteById(params.site_id as string);

		if (!site) {
			throw redirect(303, '/');
		}

		const formData = await request.formData();
		const mode = String(formData.get('mode') ?? 'credentials');
		const host = String(formData.get('host') ?? '').trim();
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const siteName = String(formData.get('siteName') ?? site.name).trim() || site.name;
		const platform = String(formData.get('platform') ?? 'routeros');
		const apiPortValue = Number(formData.get('apiPort') ?? 8728);
		const discoveryIdentity = String(formData.get('discoveryIdentity') ?? '').trim();
		const discoveryMacAddress = String(formData.get('discoveryMacAddress') ?? '').trim();
		const discoveryVersion = String(formData.get('discoveryVersion') ?? '').trim();
		const discoveryHardware = String(formData.get('discoveryHardware') ?? '').trim();
		const discoveryInterfaceName = String(formData.get('discoveryInterfaceName') ?? '').trim();
		const managementCidrs = String(formData.get('managementCidrs') ?? '').trim();

		const formState = {
			action: 'adopt',
			mode,
			host,
			username,
			siteName,
			platform,
			apiPort: apiPortValue,
			discoveryIdentity,
			discoveryMacAddress,
			discoveryVersion,
			discoveryHardware,
			discoveryInterfaceName,
			managementCidrs
		};

		if (mode === 'bootstrap') {
			try {
				const result = await devicesService.local.adoption.prepareBootstrap({
					siteId: site.id,
					requestedByUserId: locals.user.id,
					controllerBaseUrl: url.origin,
					managementCidrs
				});

				return {
					...formState,
					success: true,
					message: 'Bootstrap preparation task started.',
					jobId: result.jobId
				};
			} catch (error) {
				return fail(400, {
					...formState,
					message: error instanceof Error ? error.message : 'Bootstrap preparation failed.'
				});
			}
		}

		if (!host || !username) {
			return fail(400, {
				...formState,
				message: 'Host and username are required.',
			});
		}

		if (!Number.isInteger(apiPortValue) || apiPortValue < 1 || apiPortValue > 65535) {
			return fail(400, {
				...formState,
				message: 'API port must be a valid TCP port.',
			});
		}

		if (platform !== 'routeros' && platform !== 'switchos') {
			return fail(400, {
				...formState,
				message: 'Unknown device platform.',
			});
		}

		try {
			const result = await devicesService.local.adoption.adoptWithCredentials({
				host,
				username,
				password,
				siteName,
				siteId: site.id,
				apiPort: apiPortValue,
				platform,
				requestedByUserId: locals.user.id,
				managementCidrs
			});

			return {
				...formState,
				success: true,
				message: 'Managed adoption and provisioning task started.',
				jobId: result.jobId
			};
		} catch (error) {
			return fail(400, {
				...formState,
				message: error instanceof Error ? error.message : 'Adoption failed.',
			});
		}
	}),
	provision: provisionDeviceAction,
	remove: removeDeviceAction,
	firmwareCheck: async ({ request, params }) => {
		const siteId = params.site_id as string;
		const data = await request.formData();
		const deviceId = String(data.get('deviceId') ?? '');
		if (!deviceId) return fail(400, { message: 'Missing deviceId' });
		try {
			const job = await Service('scheduler').schedule(createFirmwareCheckTask(deviceId, siteId));
			return { success: true, message: 'Firmware check queued', jobId: job.id };
		} catch (e) {
			return fail(500, { message: String(e) });
		}
	},
	firmwareUpgrade: async ({ request, params }) => {
		const siteId = params.site_id as string;
		const data = await request.formData();
		const deviceId = String(data.get('deviceId') ?? '');
		if (!deviceId) return fail(400, { message: 'Missing deviceId' });
		try {
			const job = await Service('scheduler').schedule(createFirmwareUpgradeTask(deviceId, siteId));
			return { success: true, message: 'Firmware upgrade queued', jobId: job.id };
		} catch (e) {
			return fail(500, { message: String(e) });
		}
	}
};

export async function load({ parent, url, depends }) {
	const { site } = await parent();
	depends?.(`app:site-devices:${site.id}`);

	const host = url.searchParams.get('adopt') ?? url.searchParams.get('host') ?? '';
	const { devices, interfaces, deviceInterfaces, discoveredDevices, deviceImages } = await loadSiteDeviceState(site.id);

	const firmwareRows = await getFirmwareVersionsForDevices(devices.map((d) => d.id));
	const firmwareByDeviceId = Object.fromEntries(firmwareRows.map((f) => [f.deviceId, f]));

	return {
		devices,
		interfaces,
		discoveredDevices,
		deviceInterfaces,
		firmwareByDeviceId,
		selectedDeviceId: url.searchParams.get('device') ?? '',
		deviceImages,
		adoptionPanel: {
			open: url.searchParams.has('adopt') || url.searchParams.has('host'),
			host,
				platform: url.searchParams.get('platform') === 'switchos' ? 'switchos' : 'routeros',
			siteName: site.name,
			discovery: {
				identity: url.searchParams.get('identity') ?? '',
				macAddress: url.searchParams.get('mac') ?? '',
				version: url.searchParams.get('version') ?? '',
				hardware: url.searchParams.get('hardware') ?? '',
				interfaceName: url.searchParams.get('interface') ?? ''
			}
		}
	};
}
