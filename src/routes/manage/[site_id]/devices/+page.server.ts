import { fail, redirect } from '@sveltejs/kit';
import { listDeviceInterfaces, listDevices } from '$lib/server/repositories/device.repository';
import { findSiteById } from '$lib/server/repositories/site.repository';
import { adoptRouterOsDevice } from '$lib/server/services/adoption.service';
import { resolveDeviceImage } from '$lib/server/services/device-image-catalog.service';
import discoveryService from '$lib/server/services/discovery.service';

export async function load({ parent, url }) {
	const { site } = await parent();
	const host = url.searchParams.get('adopt') ?? url.searchParams.get('host') ?? '';
	const devices = await listDevices();
	const interfaces = await listDeviceInterfaces();
	const deviceInterfaces = interfaces.reduce<Record<string, typeof interfaces>>((groups, networkInterface) => {
		groups[networkInterface.deviceId] = [...(groups[networkInterface.deviceId] ?? []), networkInterface];
		return groups;
	}, {});
	const discoveredDevices = discoveryService.list().map((device) => ({
		id: device.id,
		identity: device.identity,
		macAddress: device.macAddress,
		platform: device.platform,
		version: device.version,
		hardware: device.hardware,
		interfaceName: device.interfaceName,
		address: device.address
	}));

	return {
		devices,
		discoveredDevices,
		deviceInterfaces,
		selectedDeviceId: url.searchParams.get('device') ?? '',
		deviceImages: Object.fromEntries([
			...devices.map((device) => [
				device.id,
				resolveDeviceImage(device.model ?? device.identity ?? device.name, device.platform)
			]),
			...discoveredDevices.map((device) => [
				device.id,
				resolveDeviceImage(device.hardware ?? device.identity ?? device.platform, device.platform ?? 'router')
			])
		]),
		adoptionPanel: {
			open: url.searchParams.has('adopt') || url.searchParams.has('host'),
			host,
			provider: url.searchParams.get('provider') === 'mock' ? 'mock' : 'real',
			platform: url.searchParams.get('platform') === 'switchos' ? 'switchos' : 'routeros',
			siteName: site.name
		}
	};
}

export const actions = {
	adopt: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/manage/account/login');
		}

		const site = await findSiteById(params.site_id);

		if (!site) {
			throw redirect(303, '/');
		}

		const formData = await request.formData();
		const host = String(formData.get('host') ?? '').trim();
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const siteName = String(formData.get('siteName') ?? site.name).trim() || site.name;
		const provider = String(formData.get('provider') ?? 'real');
		const platform = String(formData.get('platform') ?? 'routeros');
		const apiPortValue = Number(formData.get('apiPort') ?? 8728);

		if (!host || !username || !password) {
			return fail(400, {
				message: 'Host, username, and password are required.',
				host,
				username,
				siteName,
				provider,
				platform,
				apiPort: apiPortValue
			});
		}

		if (!Number.isInteger(apiPortValue) || apiPortValue < 1 || apiPortValue > 65535) {
			return fail(400, {
				message: 'API port must be a valid TCP port.',
				host,
				username,
				siteName,
				provider,
				platform,
				apiPort: apiPortValue
			});
		}

		if (platform !== 'routeros' && platform !== 'switchos') {
			return fail(400, {
				message: 'Unknown device platform.',
				host,
				username,
				siteName,
				provider,
				platform,
				apiPort: apiPortValue
			});
		}

		if (provider !== 'real' && provider !== 'mock') {
			return fail(400, {
				message: 'Unknown adoption provider.',
				host,
				username,
				siteName,
				provider,
				platform,
				apiPort: apiPortValue
			});
		}

		try {
			const result = await adoptRouterOsDevice({
				host,
				username,
				password,
				siteName,
				apiPort: apiPortValue,
				provider,
				platform,
				requestedByUserId: locals.user.id
			});

			return {
				success: true,
				message: `${result.device.name} adopted.`
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Adoption failed.',
				host,
				username,
				siteName,
				provider,
				platform,
				apiPort: apiPortValue
			});
		}
	}
};
