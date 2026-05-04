import { describe, expect, it } from 'vitest';
import { loadSiteDeviceState } from '$lib/server/services/site-device.service.js';

describe('site-devices.service', () => {
	it('loads site-scoped adopted devices and filters discovered devices by adopted host', async () => {
		const mockedDevices: any[] = [
			{
				id: 'device-1',
				name: 'Router A',
				host: '192.168.88.1',
				apiPort: 8728,
				platform: 'routeros',
				adoptionMode: 'managed',
				adoptionState: 'adopted',
				connectionStatus: 'connected',
				model: 'hEX',
				identity: 'Router A',
				serialNumber: 'ABC123',
				architecture: 'mipsbe',
				uptimeSeconds: 12345,
				routerOsVersion: '7.9',
				capabilities: [],
				tags: [],
				lastSeenAt: new Date().toISOString(),
				lastSyncAt: new Date().toISOString()
			}
		];

		const allDevices: any[] = [
			...mockedDevices,
			{
				id: 'device-2',
				name: 'Router B',
				host: '192.168.88.200',
				apiPort: 8728,
				platform: 'routeros',
				adoptionMode: 'managed',
				adoptionState: 'adopted',
				connectionStatus: 'connected',
				model: 'hEX',
				identity: 'Router B',
				serialNumber: 'DEF456',
				architecture: 'mipsbe',
				uptimeSeconds: 9876,
				routerOsVersion: '7.8',
				capabilities: [],
				tags: [],
				lastSeenAt: new Date().toISOString(),
				lastSyncAt: new Date().toISOString()
			}
		];

		const mockedInterfaces: any[] = [
			{
				id: 'interface-1',
				deviceId: 'device-1',
				name: 'ether1',
				type: 'ethernet',
				macAddress: 'AA:BB:CC:DD:EE:FF',
				comment: 'WAN',
				running: true,
				disabled: false
			}
		];

		const fakeDiscovery = {
			list: () => [
				{
					id: 'discovered-1',
					identity: 'Discovered Router',
					macAddress: 'FF:EE:DD:CC:BB:AA',
					platform: 'routeros',
					version: '7.8',
					hardware: 'hEX',
					interfaceName: 'ether1',
					address: '192.168.88.2'
				},
				{
					id: 'discovered-duplicate',
					identity: 'Duplicate Router',
					macAddress: '11:22:33:44:55:66',
					platform: 'routeros',
					version: '7.8',
					hardware: 'hEX',
					interfaceName: 'ether2',
					address: '192.168.88.1'
				}
			]
		};

		const result = await loadSiteDeviceState('site-123', {
			listDevicesFn: async (siteId?: string) =>
				siteId === 'site-123' ? mockedDevices : allDevices,
			listDeviceInterfacesFn: async () => mockedInterfaces,
			discovery: fakeDiscovery,
			resolveDeviceImageFn: () => ({ id: 'default', label: 'Device', src: '/favicon.svg' })
		});

		expect(result.devices).toEqual(mockedDevices);
		expect(result.interfaces).toEqual(mockedInterfaces);
		expect(result.deviceInterfaces['device-1']).toEqual([mockedInterfaces[0]]);
		expect(result.discoveredDevices).toHaveLength(1);
		expect(result.discoveredDevices[0].id).toBe('discovered-1');
		expect(result.deviceImages).toHaveProperty('device-1');
		expect(result.deviceImages).toHaveProperty('discovered-1');
	});
});
