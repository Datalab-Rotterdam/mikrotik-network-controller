import { Service } from '@sourceregistry/sveltekit-service-manager';
import { getDeviceById } from '$lib/server/repositories/telemetry.repository';
import { recordAuditEvent } from '$lib/server/repositories/audit.repository';
import { createRemoveDeviceTask } from '../tasks';

export default {
	async remove(deviceId: string, requestedByUserId: string) {
		const device = await getDeviceById(deviceId);

		if (!device) {
			throw new Error(`Device ${deviceId} not found`);
		}

		await recordAuditEvent({
			actorUserId: requestedByUserId,
			targetDeviceId: device.id,
			action: 'device.removal.requested',
			message: `${device.identity ?? device.name} removal requested`,
			metadata: {
				deviceId: device.id,
				host: device.host,
				siteId: device.siteId
			}
		});

		const task = await Service('scheduler').schedule(
			createRemoveDeviceTask({
				deviceId,
				siteId: device.siteId,
				requestedByUserId
			})
		);

		return {
			ok: true,
			deviceId,
			jobId: task.id
		};
	}
};
