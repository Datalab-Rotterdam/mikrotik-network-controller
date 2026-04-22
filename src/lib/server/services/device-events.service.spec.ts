import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getDeviceById: vi.fn()
}));

vi.mock('$lib/server/repositories/telemetry.repository', () => ({
	getDeviceById: mocks.getDeviceById
}));

const { deviceEvents, emitDeviceRemoved, emitDeviceUpdated } = await import('./device-events.service');

describe('device event service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deviceEvents.removeAllListeners();
	});

	it('emits device updates with site scope', async () => {
		mocks.getDeviceById.mockResolvedValue({
			id: 'device-1',
			siteId: 'site-1'
		});
		const received: unknown[] = [];
		deviceEvents.on('device.updated', (payload) => received.push(payload));

		await emitDeviceUpdated('device-1', 'telemetry');

		expect(received).toEqual([
			expect.objectContaining({
				siteId: 'site-1',
				deviceId: 'device-1',
				reason: 'telemetry',
				timestamp: expect.any(String)
			})
		]);
	});

	it('emits device removals from the captured site scope', () => {
		const received: unknown[] = [];
		deviceEvents.on('device.removed', (payload) => received.push(payload));

		emitDeviceRemoved({
			siteId: 'site-1',
			deviceId: 'device-1'
		});

		expect(received).toEqual([
			expect.objectContaining({
				siteId: 'site-1',
				deviceId: 'device-1',
				timestamp: expect.any(String)
			})
		]);
	});
});
