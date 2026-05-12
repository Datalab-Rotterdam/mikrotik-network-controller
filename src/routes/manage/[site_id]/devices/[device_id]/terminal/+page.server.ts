import { error, fail, type Actions } from '@sveltejs/kit';
import { websockets } from '@sourceregistry/sveltekit-websockets/server';
import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';
import { DeviceRepository } from '$lib/server/repositories/device.repository';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import {
	isDeviceTerminalEligible,
	startDeviceTerminalSession
} from '$lib/server/services/device-terminal.service';

const terminalUnavailableMessage =
	'Terminal access is available only for managed RouterOS devices with SSH trust.';

export const actions: Actions = {
	terminal: enhance.action(async (input) => {
		const user = input.locals.user!;

		if (!user.roles.includes('admin')) {
			return fail(403, {
				action: 'terminal',
				success: false,
				message: 'Only administrators can open a device terminal.'
			});
		}

		const device = await DeviceRepository.getByIdForSite(input.params.device_id as string, input.params.site_id as string);
		if (!device) {
			return fail(404, {
				action: 'terminal',
				success: false,
				message: 'Device not found.'
			});
		}

		const writeCredential = await TelemetryRepository.getActiveCredential(device.id, 'write');
		if (
			!isDeviceTerminalEligible({
				userRoles: user.roles,
				device,
				writeCredential
			}) ||
			!writeCredential
		) {
			return fail(403, {
				action: 'terminal',
				success: false,
				message: terminalUnavailableMessage
			});
		}

		return {
			action: 'terminal',
			success: true,
			url: websockets.use(
				input,
				(socket) => {
					void startDeviceTerminalSession({
						socket,
						device,
						credential: writeCredential,
						userId: user.id
					});
				},
				{
					timeout: 10 * 60 * 1000,
					pendingKeyExpiration: 60 * 1000
				}
			)
		};
	}, SessionContext.require)
};

export const load = enhance.load(async ({ locals, parent, params, depends }) => {
	const { site } = await parent();
	const deviceId = params.device_id as string;
	depends?.(`app:device:${deviceId}`);

	const device = await DeviceRepository.getByIdForSite(deviceId, site.id);
	if (!device) {
		throw error(404, 'Device not found');
	}

	const writeCredential = await TelemetryRepository.getActiveCredential(device.id, 'write');

	return {
		device,
		terminalAvailable: isDeviceTerminalEligible({
			userRoles: locals?.user?.roles ?? [],
			device,
			writeCredential
		}),
		terminalUnavailableMessage
	};
}, SessionContext.ensure);
