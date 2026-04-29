import { EventEmitter } from 'events';
import {
	createAlertEvent,
	getOpenAlertEvent,
	getMostRecentFiredAlertEvent,
	listAlertRules,
	resolveAlertEvent
} from '$lib/server/repositories/alerts.repository';
import { getActiveClientCountBySite } from '$lib/server/repositories/clients.repository';

type AlertFiredDetail = {
	eventId: string;
	ruleId: string;
	siteId: string;
	deviceId: string | null;
	severity: string;
	message: string;
};

type AlertResolvedDetail = {
	eventId: string;
	ruleId: string;
	siteId: string;
	deviceId: string | null;
};

interface AlertEvaluatorEvents {
	'alert:fired': (detail: AlertFiredDetail) => void;
	'alert:resolved': (detail: AlertResolvedDetail) => void;
}

class AlertEvaluatorEmitter extends EventEmitter {
	on<K extends keyof AlertEvaluatorEvents>(event: K, listener: AlertEvaluatorEvents[K]): this {
		return super.on(event, listener);
	}
	emit<K extends keyof AlertEvaluatorEvents>(
		event: K,
		...args: Parameters<AlertEvaluatorEvents[K]>
	): boolean {
		return super.emit(event, ...args);
	}
}

export const alertEvaluatorEvents = new AlertEvaluatorEmitter();

type MetricSnapshot = {
	deviceId: string;
	siteId: string | null;
	cpuPercent: number | null;
	freeMemoryBytes: number | null;
	totalMemoryBytes: number | null;
	temperatureCelsius: number | null;
	uptimeSeconds: number | null;
};

function isCooldownActive(lastFiredAt: Date, cooldownSeconds: number): boolean {
	return Date.now() - lastFiredAt.getTime() < cooldownSeconds * 1000;
}

async function fireAlert(
	ruleId: string,
	siteId: string,
	deviceId: string | null,
	severity: string,
	message: string,
	metadata: Record<string, unknown> = {}
): Promise<void> {
	const event = await createAlertEvent({
		ruleId,
		siteId,
		deviceId,
		message,
		metadata,
		firedAt: new Date()
	});

	alertEvaluatorEvents.emit('alert:fired', {
		eventId: event.id,
		ruleId,
		siteId,
		deviceId,
		severity,
		message
	});
}

async function resolveIfOpen(
	ruleId: string,
	siteId: string,
	deviceId: string | null
): Promise<void> {
	const open = await getOpenAlertEvent(ruleId, deviceId);
	if (!open) return;

	await resolveAlertEvent(open.id);
	alertEvaluatorEvents.emit('alert:resolved', {
		eventId: open.id,
		ruleId,
		siteId,
		deviceId
	});
}

export async function evaluateDeviceMetric(metric: MetricSnapshot): Promise<void> {
	if (!metric.siteId) return;

	const rules = await listAlertRules(metric.siteId);
	const enabledRules = rules.filter((r) => r.enabled);

	for (const rule of enabledRules) {
		const scope = rule.scope as { deviceIds?: string[] };
		if (scope.deviceIds?.length && !scope.deviceIds.includes(metric.deviceId)) continue;

		const params = rule.conditionParams as Record<string, unknown>;

		try {
			if (rule.conditionType === 'device_offline') {
				// device_offline is handled separately via evaluateDeviceOffline
				continue;
			}

			if (rule.conditionType === 'cpu_above') {
				const threshold = Number(params['threshold'] ?? 90);
				if (metric.cpuPercent !== null && metric.cpuPercent > threshold) {
					const open = await getOpenAlertEvent(rule.id, metric.deviceId);
					if (!open) {
						const last = await getMostRecentFiredAlertEvent(rule.id, metric.deviceId);
						if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
							await fireAlert(
								rule.id,
								metric.siteId,
								metric.deviceId,
								rule.severity,
								`CPU usage at ${metric.cpuPercent.toFixed(1)}% (threshold: ${threshold}%)`,
								{ cpuPercent: metric.cpuPercent, threshold }
							);
						}
					}
				} else {
					await resolveIfOpen(rule.id, metric.siteId, metric.deviceId);
				}
			}

			if (rule.conditionType === 'memory_below') {
				const thresholdMb = Number(params['thresholdMb'] ?? 64);
				const freeBytes = metric.freeMemoryBytes;
				if (freeBytes !== null && freeBytes / 1_048_576 < thresholdMb) {
					const open = await getOpenAlertEvent(rule.id, metric.deviceId);
					if (!open) {
						const last = await getMostRecentFiredAlertEvent(rule.id, metric.deviceId);
						if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
							const freeMb = (freeBytes / 1_048_576).toFixed(1);
							await fireAlert(
								rule.id,
								metric.siteId,
								metric.deviceId,
								rule.severity,
								`Free memory at ${freeMb} MB (threshold: ${thresholdMb} MB)`,
								{ freeMemoryBytes: freeBytes, thresholdMb }
							);
						}
					}
				} else {
					await resolveIfOpen(rule.id, metric.siteId, metric.deviceId);
				}
			}

			if (rule.conditionType === 'temperature_above') {
				const threshold = Number(params['threshold'] ?? 70);
				if (metric.temperatureCelsius !== null && metric.temperatureCelsius > threshold) {
					const open = await getOpenAlertEvent(rule.id, metric.deviceId);
					if (!open) {
						const last = await getMostRecentFiredAlertEvent(rule.id, metric.deviceId);
						if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
							await fireAlert(
								rule.id,
								metric.siteId,
								metric.deviceId,
								rule.severity,
								`Temperature at ${metric.temperatureCelsius.toFixed(1)}°C (threshold: ${threshold}°C)`,
								{ temperatureCelsius: metric.temperatureCelsius, threshold }
							);
						}
					}
				} else {
					await resolveIfOpen(rule.id, metric.siteId, metric.deviceId);
				}
			}

			if (
				rule.conditionType === 'client_count_above' ||
				rule.conditionType === 'client_count_below'
			) {
				const threshold = Number(params['threshold'] ?? 0);
				const count = await getActiveClientCountBySite(metric.siteId);

				const triggered =
					rule.conditionType === 'client_count_above'
						? count > threshold
						: count < threshold;

				if (triggered) {
					const open = await getOpenAlertEvent(rule.id, null);
					if (!open) {
						const last = await getMostRecentFiredAlertEvent(rule.id, null);
						if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
							const direction = rule.conditionType === 'client_count_above' ? 'above' : 'below';
							await fireAlert(
								rule.id,
								metric.siteId,
								null,
								rule.severity,
								`Client count ${count} is ${direction} threshold ${threshold}`,
								{ count, threshold }
							);
						}
					}
				} else {
					await resolveIfOpen(rule.id, metric.siteId, null);
				}
			}
		} catch {
			// don't let one rule failure block the rest
		}
	}
}

export async function evaluateDeviceOffline(deviceId: string, siteId: string): Promise<void> {
	const rules = await listAlertRules(siteId);
	const offlineRules = rules.filter(
		(r) => r.enabled && r.conditionType === 'device_offline'
	);

	for (const rule of offlineRules) {
		const scope = rule.scope as { deviceIds?: string[] };
		if (scope.deviceIds?.length && !scope.deviceIds.includes(deviceId)) continue;

		const open = await getOpenAlertEvent(rule.id, deviceId);
		if (!open) {
			const last = await getMostRecentFiredAlertEvent(rule.id, deviceId);
			if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
				await fireAlert(rule.id, siteId, deviceId, rule.severity, 'Device went offline', {
					deviceId
				});
			}
		}
	}
}

export async function evaluateDeviceOnline(deviceId: string, siteId: string): Promise<void> {
	const rules = await listAlertRules(siteId);
	const offlineRules = rules.filter(
		(r) => r.enabled && r.conditionType === 'device_offline'
	);

	for (const rule of offlineRules) {
		await resolveIfOpen(rule.id, siteId, deviceId);
	}
}
