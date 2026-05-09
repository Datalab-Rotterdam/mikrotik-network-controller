import AlertRepository from '../repositories/alert.repository';
import {getActiveClientCountBySite} from '$lib/server/repositories/clients.repository';
import {Service} from "@sourceregistry/sveltekit-service-manager";



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

export async function evaluateDeviceMetric(metric: MetricSnapshot): Promise<void> {
    if (!metric.siteId) return;

    const rules = await AlertRepository.rules.list({siteId: metric.siteId});
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
                    const open = await AlertRepository.events({siteId: metric.siteId}).open({
                        ruleId: rule.id,
                        deviceId: metric.deviceId
                    });
                    if (!open) {
                        const last = await AlertRepository.events({siteId: metric.siteId}).mostRecent({
                            ruleId: rule.id,
                            deviceId: metric.deviceId
                        });
                        if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
                            await Service('alert', {siteId: metric.siteId})
                                .fire({
                                    ruleId: rule.id,
                                    deviceId: metric.deviceId,
                                    severity: rule.severity,
                                    message: `CPU usage at ${metric.cpuPercent.toFixed(1)}% (threshold: ${threshold}%)`,
                                    metadata: {cpuPercent: metric.cpuPercent, threshold}
                                });
                        }
                    }
                } else {
                    await Service('alert', {siteId: metric.siteId}).resolve({ruleId: rule.id, deviceId: metric.deviceId});
                }
            }

            if (rule.conditionType === 'memory_below') {
                const thresholdMb = Number(params['thresholdMb'] ?? 64);
                const freeBytes = metric.freeMemoryBytes;
                if (freeBytes !== null && freeBytes / 1_048_576 < thresholdMb) {
                    const open = await AlertRepository.events({siteId: metric.siteId}).open({
                        ruleId: rule.id,
                        deviceId: metric.deviceId
                    });
                    if (!open) {
                        const last = await AlertRepository.events({siteId: metric.siteId}).mostRecent({
                            ruleId: rule.id,
                            deviceId: metric.deviceId
                        });
                        if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
                            const freeMb = (freeBytes / 1_048_576).toFixed(1);
                            await Service('alert', {siteId: metric.siteId})
                                .fire({
                                    ruleId: rule.id,
                                    deviceId: metric.deviceId,
                                    severity: rule.severity,
                                    message: `Free memory at ${freeMb} MB (threshold: ${thresholdMb} MB)`,
                                    metadata: {freeMemoryBytes: freeBytes, thresholdMb}
                                })
                        }
                    }
                } else {
                    await Service('alert', {siteId: metric.siteId}).resolve({ruleId: rule.id, deviceId: metric.deviceId});
                }
            }

            if (rule.conditionType === 'temperature_above') {
                const threshold = Number(params['threshold'] ?? 70);
                if (metric.temperatureCelsius !== null && metric.temperatureCelsius > threshold) {
                    const open = await AlertRepository.events({siteId: metric.siteId}).open({
                        ruleId: rule.id,
                        deviceId: metric.deviceId
                    });
                    if (!open) {
                        const last = await AlertRepository.events({siteId: metric.siteId}).mostRecent({
                            ruleId: rule.id,
                            deviceId: metric.deviceId
                        });
                        if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
                            await Service('alert', {siteId: metric.siteId}).fire({
                                    ruleId: rule.id,
                                    deviceId: metric.deviceId,
                                    severity: rule.severity,
                                    message: `Temperature at ${metric.temperatureCelsius.toFixed(1)}°C (threshold: ${threshold}°C)`,
                                    metadata: {temperatureCelsius: metric.temperatureCelsius, threshold}
                                }
                            );
                        }
                    }
                } else {
                    await Service('alert', {siteId: metric.siteId}).resolve({ruleId: rule.id, deviceId: metric.deviceId});
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
                    const open = await AlertRepository.events({siteId: metric.siteId}).open({ruleId: rule.id});
                    if (!open) {
                        const last = await AlertRepository.events({siteId: metric.siteId}).mostRecent({ruleId: rule.id});
                        if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
                            const direction = rule.conditionType === 'client_count_above' ? 'above' : 'below';
                            await Service('alert', {siteId: metric.siteId})
                                .fire({
                                    ruleId: rule.id,
                                    severity: rule.severity,
                                    message: `Client count ${count} is ${direction} threshold ${threshold}`,
                                    metadata: {count, threshold}
                                });
                        }
                    }
                } else {
                    await Service('alert', {siteId: metric.siteId}).resolve({ruleId: rule.id, deviceId: metric.deviceId});
                }
            }
        } catch {
            // don't let one rule failure block the rest
        }
    }
}

export async function evaluateDeviceOffline(deviceId: string, siteId: string): Promise<void> {
    const rules = await AlertRepository.rules.list({siteId});
    const offlineRules = rules.filter(
        (r) => r.enabled && r.conditionType === 'device_offline'
    );

    for (const rule of offlineRules) {
        const scope = rule.scope as { deviceIds?: string[] };
        if (scope.deviceIds?.length && !scope.deviceIds.includes(deviceId)) continue;

        const open = await AlertRepository.events({siteId}).open({ruleId: rule.id, deviceId});

        if (!open) {
            const last = await AlertRepository.events({siteId}).mostRecent({ruleId: rule.id, deviceId});
            if (!last || !isCooldownActive(last.firedAt, rule.cooldownSeconds)) {
                await Service('alert', {siteId})
                    .fire({
                        ruleId: rule.id,
                        severity: rule.severity,
                        deviceId,
                        message: 'Device went offline',
                        metadata: {
                            deviceId
                        }
                    });
            }
        }
    }
}

export async function evaluateDeviceOnline(deviceId: string, siteId: string): Promise<void> {
    const rules = await AlertRepository.rules.list({siteId});
    const offlineRules = rules.filter(
        (r) => r.enabled && r.conditionType === 'device_offline'
    );

    for (const rule of offlineRules) {
        await Service('alert', {siteId}).resolve({ruleId: rule.id, deviceId});
    }
}
