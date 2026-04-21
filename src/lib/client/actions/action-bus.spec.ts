import { describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { createActionBus } from './action-bus';
import type { ActionEvent } from '$lib/shared/action-events';

const jobEvent: ActionEvent = {
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
			progress: 50,
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
};

describe('action bus', () => {
	it('publishes only matching events and unsubscribes handlers', () => {
		const bus = createActionBus();
		const received: ActionEvent[] = [];
		const unsubscribe = bus.subscribe(['job.updated'], (event) => {
			received.push(event);
		});

		bus.publish({
			type: 'discovery.snapshot',
			payload: {
				discoveredDevices: []
			}
		});
		bus.publish(jobEvent);

		expect(received).toEqual([jobEvent]);
		expect(get(bus.state).lastEventAt).toBeTruthy();

		unsubscribe();
		bus.publish(jobEvent);

		expect(received).toHaveLength(1);
	});
});
