import { fail, redirect } from '@sveltejs/kit';
import websockets from '@sourceregistry/sveltekit-websockets/server';
import { listRecentAdoptionAttempts } from '$lib/server/repositories/adoption.repository';
import { listDevices } from '$lib/server/repositories/device.repository';
import { listSites } from '$lib/server/repositories/site.repository';
import { adoptRouterOsDevice } from '$lib/server/services/adoption.service';
import discoveryService from '$lib/server/services/discovery.service';

export async function load({ url }) {
	return {
		sites: await listSites(),
		devices: await listDevices(),
		attempts: await listRecentAdoptionAttempts(),
		prefill: {
			host: url.searchParams.get('host') ?? '',
			provider: url.searchParams.get('provider') === 'mock' ? 'mock' : 'real'
		}
	};
}

export const actions = {
	default: (event) => {
		const url = websockets.use(event, (ws) => {
			const onNeighbor = (neighbor: unknown) => {
				ws.send(JSON.stringify(neighbor));
			};

			discoveryService.on('neighbor', onNeighbor);

			ws.on('close', () => {
				discoveryService.off('neighbor', onNeighbor);
			});
		});

		return { url };
	},
	adopt: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const host = String(formData.get('host') ?? '').trim();
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');
		const siteName = String(formData.get('siteName') ?? 'Default').trim() || 'Default';
		const provider = String(formData.get('provider') ?? 'real');
		const apiPortValue = Number(formData.get('apiPort') ?? 8728);

		if (!host || !username || !password) {
			return fail(400, {
				message: 'Host, username, and password are required.',
				host,
				username,
				siteName,
				provider,
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
				requestedByUserId: locals.user.id
			});

			return {
				success: true,
				message: `${result.device.name} adopted in read-only mode.`
			};
		} catch (error) {
			return fail(400, {
				message: error instanceof Error ? error.message : 'Adoption failed.',
				host,
				username,
				siteName,
				provider,
				apiPort: apiPortValue
			});
		}
	}
};
