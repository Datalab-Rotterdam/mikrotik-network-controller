import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	listAlertRules,
	listAlertEvents,
	listNotificationChannels,
	createAlertRule,
	updateAlertRule,
	deleteAlertRule,
	createNotificationChannel,
	updateNotificationChannel,
	deleteNotificationChannel,
	acknowledgeAlertEvent,
	setRuleChannels
} from '$lib/server/repositories/alerts.repository';

export const load: PageServerLoad = async ({ params, depends }) => {
	depends(`app:alerts:${params.site_id}`);

	const [rules, events, channels] = await Promise.all([
		listAlertRules(params.site_id),
		listAlertEvents(params.site_id, 50),
		listNotificationChannels(params.site_id)
	]);

	return { rules, events, channels };
};

export const actions: Actions = {
	createRule: async ({ request, params }) => {
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

		const rule = await createAlertRule({
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
			await setRuleChannels(rule.id, channelIds);
		}

		return { success: true };
	},

	toggleRule: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const enabled = data.get('enabled') === 'true';
		await updateAlertRule(id, { enabled });
		return { success: true };
	},

	deleteRule: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		await deleteAlertRule(id);
		return { success: true };
	},

	createChannel: async ({ request, params }) => {
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

		await createNotificationChannel({ siteId: params.site_id, name, type, config, enabled: true });
		return { success: true };
	},

	deleteChannel: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		await deleteNotificationChannel(id);
		return { success: true };
	},

	acknowledge: async ({ request, locals }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const userId = locals.user?.id;
		if (!userId) return fail(401, { error: 'Unauthorized' });
		await acknowledgeAlertEvent(id, userId);
		return { success: true };
	}
};
