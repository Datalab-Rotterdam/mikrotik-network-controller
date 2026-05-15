import { portLayoutCatalog } from '$lib/shared/device-port-layouts';
import { resolveDeviceImage } from '$lib/server/services/devices.service/image-catalog';

export function load() {
	const modelImages = Object.fromEntries(
		portLayoutCatalog.map((entry) => [
			entry.model,
			resolveDeviceImage(entry.model, 'router').src
		])
	);

	return { modelImages };
}
