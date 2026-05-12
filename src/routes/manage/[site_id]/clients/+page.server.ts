import { enhance } from '@sourceregistry/sveltekit-enhance';
import { ClientRepository } from '$lib/server/repositories/clients.repository';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { SessionContext } from '$lib/server/context/session.context';

export const load = enhance.load(
	async ({ params }) => {
		const [clients, siteDevices] = await Promise.all([
			ClientRepository.getActiveBySite(params.site_id),
			DeviceRepository.list(params.site_id)
		]);

		return { clients, siteDevices };
	},
	SessionContext.ensure
);
