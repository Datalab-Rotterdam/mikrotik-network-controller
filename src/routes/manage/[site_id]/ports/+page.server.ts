import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { Service } from '@sourceregistry/sveltekit-service-manager/server';
import configurePortTask from '$lib/server/services/devices.service/tasks/configure-port.task';
import type { Actions } from './$types';

export const load = enhance.load(async ({ parent, depends }) => {
	const { site } = await parent();
	depends(`app:site-devices:${site.id}`);

	const [devices, interfaces] = await Promise.all([
		DeviceRepository.list(site.id),
		DeviceRepository.listInterfaces(site.id)
	]);

	const interfacesByDevice: Record<string, typeof interfaces> = {};
	for (const iface of interfaces) {
		if (!interfacesByDevice[iface.deviceId]) {
			interfacesByDevice[iface.deviceId] = [];
		}
		interfacesByDevice[iface.deviceId].push(iface);
	}

	return { devices, interfacesByDevice };
}, SessionContext.ensure);

export const actions: Actions = {
	configurePort: enhance.action(async ({ request, params }) => {
		const siteId = params.site_id as string;
		const data = await request.formData();
		const deviceId = String(data.get('deviceId') ?? '');
		const portName = String(data.get('portName') ?? '');
		if (!deviceId || !portName) {
			return { success: false, message: 'Missing device or port.' };
		}

		const pvid = data.get('pvid') ? Number(data.get('pvid')) : null;
		const frameTypes = (data.get('frameTypes') as string | null) || null;
		const disabled = data.get('disabled') === 'true';
		const comment = (data.get('comment') as string | null) || null;
		const bridge = (data.get('bridge') as string | null) || null;

		const interfaces = await DeviceRepository.listInterfaces();
		const current = interfaces.find((i) => i.deviceId === deviceId && i.name === portName);

		const task = configurePortTask(
			deviceId,
			siteId,
			portName,
			{ pvid, frameTypes, disabled, comment, bridge: bridge ?? current?.bridge ?? null },
			{
				pvid: current?.pvid ?? null,
				frameTypes: current?.frameTypes ?? null,
				disabled: current?.disabled ?? false,
				comment: current?.comment ?? null,
				bridge: current?.bridge ?? null
			}
		);

		const job = await Service('scheduler').schedule(task);
		return { success: true, jobId: job.id, message: 'Port configuration queued.' };
	}, SessionContext.require)
};
