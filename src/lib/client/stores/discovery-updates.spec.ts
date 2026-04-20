import { describe, expect, it, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	discoveredDevices,
	initializeDiscoveryDeviceSnapshot,
	processDiscoveryWebSocketMessage
} from './discovery-updates';

describe('discovery-updates store', () => {
	beforeEach(() => {
		discoveredDevices.set([]);
	});

	it('accepts a snapshot and exposes discovered devices', () => {
		processDiscoveryWebSocketMessage({
			type: 'snapshot',
			payload: {
				discoveredDevices: [
					{
						id: 'discovered-1',
						identity: 'Discovered Router',
						address: '10.0.0.1'
					}
				]
			}
		});

		expect(get(discoveredDevices)).toEqual([
			{
				id: 'discovered-1',
				identity: 'Discovered Router',
				address: '10.0.0.1'
			}
		]);
	});

	it('updates existing discovery entries when neighbor events arrive', () => {
		initializeDiscoveryDeviceSnapshot([
			{
				id: 'discovered-1',
				identity: 'Discovered Router',
				address: '10.0.0.1',
				uptimeSeconds: 12
			}
		]);

		processDiscoveryWebSocketMessage({
			type: 'discovery.neighbor',
			payload: {
				id: 'discovered-1',
				identity: 'Discovered Router',
				address: '10.0.0.1',
				uptimeSeconds: 24
			}
		});

		expect(get(discoveredDevices)).toEqual([
			{
				id: 'discovered-1',
				identity: 'Discovered Router',
				address: '10.0.0.1',
				uptimeSeconds: 24
			}
		]);
	});

	it('removes discovered devices when adoption events are received', () => {
		initializeDiscoveryDeviceSnapshot([
			{
				id: 'discovered-1',
				identity: 'Discovered Router',
				address: '10.0.0.1'
			}
		]);

		processDiscoveryWebSocketMessage({
			type: 'device.adopted',
			payload: {
				host: '10.0.0.1',
				deviceId: 'device-1',
				siteId: 'site-1',
				siteName: 'Site One',
				timestamp: new Date().toISOString()
			}
		});

		expect(get(discoveredDevices)).toEqual([]);
	});
});
