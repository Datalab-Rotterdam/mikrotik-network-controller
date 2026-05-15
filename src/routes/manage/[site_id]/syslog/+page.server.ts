import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';
import { SyslogRepository } from '$lib/server/repositories/syslog.repository';
import { DeviceRepository } from '$lib/server/repositories/device.repository';

export const load = enhance.load(async ({ parent, url, depends }) => {
	const { site } = await parent();
	depends(`app:syslog:${site.id}`);

	const severity = url.searchParams.get('severity') ?? undefined;
	const category = url.searchParams.get('category') ?? undefined;

	const [events, devices] = await Promise.all([
		SyslogRepository.list(site.id, { limit: 300, severity, category }),
		DeviceRepository.list(site.id)
	]);

	const deviceMap = Object.fromEntries(devices.map((d) => [d.id, d.name ?? d.identity ?? d.host]));

	return {
		site,
		events,
		deviceMap,
		filters: { severity: severity ?? '', category: category ?? '' }
	};
}, SessionContext.ensure);
