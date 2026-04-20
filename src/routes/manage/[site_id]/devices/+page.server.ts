import { fail, redirect, type Actions } from '@sveltejs/kit';
import { findSiteById } from '$lib/server/repositories/site.repository';
import { adoptRouterOsDevice } from '$lib/server/services/adoption.service';
import { loadSiteDeviceState } from '$lib/server/services/site-device.service';

export const actions: Actions = {
	adopt: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/manage/account/login');
		}

		const site = await findSiteById(params.site_id as string);

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

export async function load({ parent, url }) {
	const { site } = await parent();
	const host = url.searchParams.get('adopt') ?? url.searchParams.get('host') ?? '';
	const { devices, interfaces, deviceInterfaces, discoveredDevices, deviceImages } = await loadSiteDeviceState(site.id);

	return {
		devices,
		discoveredDevices,
		deviceInterfaces,
		selectedDeviceId: url.searchParams.get('device') ?? '',
		deviceImages,
		adoptionPanel: {
			open: url.searchParams.has('adopt') || url.searchParams.has('host'),
			host,
			provider: url.searchParams.get('provider') === 'mock' ? 'mock' : 'real',
			platform: url.searchParams.get('platform') === 'switchos' ? 'switchos' : 'routeros',
			siteName: site.name
		}
	};
}
