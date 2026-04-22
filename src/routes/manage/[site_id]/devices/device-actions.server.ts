import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { getDeviceByIdForSite } from '$lib/server/repositories/device.repository';
import { findSiteById } from '$lib/server/repositories/site.repository';
import { service as devicesService } from '$lib/server/services/devices.service';

export async function provisionDeviceAction({ request, locals, params }: RequestEvent) {
	if (!locals.user) {
		throw redirect(303, '/manage/account/login');
	}

	const site = await findSiteById(params.site_id as string);

	if (!site) {
		throw redirect(303, '/');
	}

	const formData = await request.formData();
	const deviceId = String(formData.get('deviceId') ?? '').trim();

	if (!deviceId) {
		return fail(400, {
			action: 'provision',
			message: 'Device is required.'
		});
	}

	const device = await getDeviceByIdForSite(deviceId, site.id);
	if (!device) {
		return fail(404, {
			action: 'provision',
			message: 'Device not found for this site.',
			deviceId
		});
	}

	try {
		const result = await devicesService.local.provisioning.provision(deviceId);

		return {
			action: 'provision',
			success: true,
			message: `${device.identity ?? device.name} provisioning scheduled.`,
			jobId: result.jobId,
			deviceId
		};
	} catch (error) {
		return fail(400, {
			action: 'provision',
			message: error instanceof Error ? error.message : 'Provisioning failed.',
			deviceId
		});
	}
}

export async function removeDeviceAction({ request, locals, params }: RequestEvent) {
	if (!locals.user) {
		throw redirect(303, '/manage/account/login');
	}

	const site = await findSiteById(params.site_id as string);

	if (!site) {
		throw redirect(303, '/');
	}

	const formData = await request.formData();
	const deviceId = String(formData.get('deviceId') ?? '').trim();

	if (!deviceId) {
		return fail(400, {
			action: 'remove',
			message: 'Device is required.'
		});
	}

	const device = await getDeviceByIdForSite(deviceId, site.id);
	if (!device) {
		return fail(404, {
			action: 'remove',
			message: 'Device not found for this site.',
			deviceId
		});
	}

	if (device.platform !== 'routeros') {
		return fail(400, {
			action: 'remove',
			message: 'Only RouterOS devices can be reset and removed.',
			deviceId
		});
	}

	try {
		const result = await devicesService.local.removal.remove(deviceId, locals.user.id);

		return {
			action: 'remove',
			success: true,
			message: `${device.identity ?? device.name} removal scheduled.`,
			jobId: result.jobId,
			deviceId
		};
	} catch (error) {
		return fail(400, {
			action: 'remove',
			message: error instanceof Error ? error.message : 'Device removal failed.',
			deviceId
		});
	}
}
