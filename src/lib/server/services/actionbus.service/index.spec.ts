import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	broadcast: vi.fn(),
	destroy: vi.fn(),
	listener: vi.fn(),
	resolveUser: vi.fn()
}));

vi.mock('@sourceregistry/sveltekit-actionbus/server', () => ({
	createActionBus: vi.fn(() => ({
		broadcast: mocks.broadcast,
		destroy: mocks.destroy
	}))
}));

vi.mock('@sourceregistry/sveltekit-service-manager/server', () => ({
	ServiceManager: {
		Load: vi.fn((service) => service)
	},
	Service: vi.fn((name: string) => {
		if (name === 'devices') {
			return {
				event: {
					any: mocks.listener
				}
			};
		}

		return {
			resolveUser: mocks.resolveUser
		};
	})
}));

vi.mock('@sourceregistry/sveltekit-service-manager', () => ({
	ServiceManager: {
		Load: vi.fn((service) => service)
	},
	Service: vi.fn((name: string) => {
		if (name === 'devices') {
			return {
				event: {
					any: mocks.listener
				}
			};
		}

		return {
			resolveUser: mocks.resolveUser
		};
	})
}));

vi.mock('$lib/server/configurations/env.configuration', () => ({
	default: {
		SESSION_COOKIE_NAME: 'mnc_session'
	}
}));

vi.mock('$lib/server/services/discovery.service', () => ({
	default: {
		on: mocks.listener
	}
}));

vi.mock('$lib/server/services/devices.service', () => ({}));
vi.mock('$lib/server/services/monitoring.service', () => ({
	monitoringEvents: { any: mocks.listener }
}));
vi.mock('$lib/server/services/scheduler.service', () => ({
	schedulerEvents: { any: mocks.listener }
}));
vi.mock('$lib/server/services/alert.service', () => ({
	alertEvents: { any: mocks.listener }
}));
vi.mock('$lib/server/repositories/device.repository', () => ({
	listDevices: vi.fn()
}));
vi.mock('$lib/server/repositories/clients.repository', () => ({
	getActiveClientCountBySite: vi.fn()
}));
vi.mock('$lib/server/repositories/job.repository', () => ({
	getJobWithSteps: vi.fn()
}));
vi.mock('$lib/server/repositories/metrics.repository', () => ({
	getLatestDeviceMetric: vi.fn()
}));

import { channelsForEvent, siteChannel } from './index';

describe('actionbus service channel routing', () => {
	it('builds site channels from site ids', () => {
		expect(siteChannel('site-1')).toBe('site:site-1');
	});

	it('routes site-scoped events to the matching site channel', () => {
		expect(
			channelsForEvent({
				type: 'job.updated',
				payload: {
					siteId: 'site-1',
					job: {
						id: 'job-1',
						type: 'sync',
						status: 'running',
						deviceId: 'device-1',
						siteId: 'site-1',
						requestedByUserId: null,
						progress: 20,
						attemptCount: 1,
						maxAttempts: 1,
						payload: {},
						result: null,
						errorMessage: null,
						scheduledFor: null,
						lockedAt: null,
						lockedBy: null,
						startedAt: null,
						finishedAt: null,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
						steps: []
					}
				}
			})
		).toEqual(['site:site-1']);

		expect(
			channelsForEvent({
				type: 'device.updated',
				payload: {
					siteId: 'site-2',
					deviceId: 'device-2',
					reason: 'telemetry',
					connectionStatus: 'online',
					timestamp: '2026-01-01T00:00:00.000Z'
				}
			})
		).toEqual(['site:site-2']);

		expect(
			channelsForEvent({
				type: 'alert.fired',
				payload: {
					id: 'alert-1',
					ruleId: 'rule-1',
					siteId: 'site-3',
					deviceId: null,
					severity: 'critical',
					message: 'CPU high'
				}
			})
		).toEqual(['site:site-3']);

		expect(
			channelsForEvent({
				type: 'topology.updated',
				payload: {
					siteId: 'site-4'
				}
			})
		).toEqual(['site:site-4']);
	});

	it('does not route nullable site events without a site id', () => {
		expect(
			channelsForEvent({
				type: 'job.updated',
				payload: {
					siteId: null,
					job: {
						id: 'job-1',
						type: 'sync',
						status: 'running',
						deviceId: 'device-1',
						siteId: null,
						requestedByUserId: null,
						progress: 20,
						attemptCount: 1,
						maxAttempts: 1,
						payload: {},
						result: null,
						errorMessage: null,
						scheduledFor: null,
						lockedAt: null,
						lockedBy: null,
						startedAt: null,
						finishedAt: null,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
						steps: []
					}
				}
			})
		).toEqual([]);

		expect(
			channelsForEvent({
				type: 'metric.updated',
				payload: {
					deviceId: 'device-1',
					siteId: null,
					cpuPercent: 50,
					freeMemoryBytes: null,
					totalMemoryBytes: null,
					temperatureCelsius: null,
					uptimeSeconds: null,
					collectedAt: '2026-01-01T00:00:00.000Z'
				}
			})
		).toEqual([]);
	});

	it('routes discovery events to the discovery channel', () => {
		expect(
			channelsForEvent({
				type: 'discovery.snapshot',
				payload: {
					discoveredDevices: []
				}
			})
		).toEqual(['discovery']);

		expect(
			channelsForEvent({
				type: 'discovery.neighbor',
				payload: {
					id: 'neighbor-1',
					address: '192.0.2.10'
				}
			})
		).toEqual(['discovery']);
	});
});
