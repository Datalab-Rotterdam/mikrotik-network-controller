import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AlertRepository } from '$lib/server/repositories/alerts.repository';
import { enhance } from '@sourceregistry/sveltekit-enhance';
import { SessionContext } from '$lib/server/context/session.context';

export const load: PageServerLoad = enhance.load(
	async ({ params, depends }) => {
		depends(`app:alerts:${params.site_id}`);

		const [rules, events, channels] = await Promise.all([
			AlertRepository.listRules(params.site_id),
			AlertRepository.listEvents(params.site_id, 50),
			AlertRepository.listChannels(params.site_id)
		]);

		return { rules, events, channels };
	},
	SessionContext.ensure
);

export const actions: Actions = {
	createRule: enhance.action(async ({ request, params }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const conditionType = String(data.get('conditionType') ?? '') as
			| 'device_offline'
			| 'cpu_above'
			| 'memory_below'
			| 'temperature_above'
			| 'interface_down'
			| 'client_count_above'
			| 'client_count_below';
		const severity = String(data.get('severity') ?? 'warning') as
			| 'info'
			| 'warning'
			| 'critical';
		const threshold = data.get('threshold');
		const cooldownSeconds = Number(data.get('cooldownSeconds') ?? 300);
		const channelIds = data.getAll('channelIds').map(String);

		if (!name || !conditionType) return fail(400, { error: 'Name and condition type are required' });

		const conditionParams: Record<string, unknown> = {};
		if (threshold !== null && threshold !== '') {
			if (conditionType === 'memory_below') {
				conditionParams['thresholdMb'] = Number(threshold);
			} else {
				conditionParams['threshold'] = Number(threshold);
			}
		}

		const rule = await AlertRepository.createRule({
			siteId: params.site_id,
			name,
			conditionType,
			conditionParams,
			severity,
			cooldownSeconds,
			scope: {},
			enabled: true
		});

		if (channelIds.length > 0) {
			await AlertRepository.setRuleChannels(rule.id, channelIds);
		}

		return { success: true };
	}, SessionContext.require),

	toggleRule: enhance.action(async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const enabled = data.get('enabled') === 'true';
		await AlertRepository.updateRule(id, { enabled });
		return { success: true };
	}, SessionContext.require),

	deleteRule: enhance.action(async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		await AlertRepository.deleteRule(id);
		return { success: true };
	}, SessionContext.require),

	createChannel: enhance.action(async ({ request, params }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();
		const type = String(data.get('type') ?? '') as 'webhook' | 'slack' | 'email';
		const configRaw = String(data.get('config') ?? '{}');

		if (!name || !type) return fail(400, { error: 'Name and type are required' });

		let config: Record<string, unknown> = {};
		try {
			config = JSON.parse(configRaw);
		} catch {
			return fail(400, { error: 'Invalid JSON in config' });
		}

		await AlertRepository.createChannel({ siteId: params.site_id, name, type, config, enabled: true });
		return { success: true };
	}, SessionContext.require),

	deleteChannel: enhance.action(async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		await AlertRepository.deleteChannel(id);
		return { success: true };
	}, SessionContext.require),

	acknowledge: enhance.action(async ({ request, context }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		await AlertRepository.acknowledgeEvent(id, context.user.id);
		return { success: true }
	}, SessionContext.require)
};
