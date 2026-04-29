import { EventEmitter } from 'node:events';

export type MonitoringEventMap = {
	'metric:updated': { deviceId: string; siteId: string | null; collectedAt: Date };
	'client:updated': { siteId: string | null };
	'topology:updated': { siteId: string | null };
};

class MonitoringEventEmitter extends EventEmitter {
	emit<K extends keyof MonitoringEventMap>(event: K, payload: MonitoringEventMap[K]): boolean {
		return super.emit(event, payload);
	}

	on<K extends keyof MonitoringEventMap>(
		event: K,
		listener: (payload: MonitoringEventMap[K]) => void
	): this {
		return super.on(event, listener);
	}
}

export const monitoringEvents = new MonitoringEventEmitter();
