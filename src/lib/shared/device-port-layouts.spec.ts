import { describe, expect, it } from 'vitest';
import {
	findPortLayout,
	resolveDevicePortLayout,
	type DevicePortInterface
} from './device-port-layouts';

function iface(name: string, patch: Partial<DevicePortInterface> = {}): DevicePortInterface {
	return {
		id: name,
		name,
		type: 'ether',
		macAddress: null,
		comment: null,
		running: false,
		disabled: false,
		...patch
	};
}

describe('device port layouts', () => {
	it('matches models by alias', () => {
		expect(findPortLayout('CRS326-24G-2S+RM')?.model).toBe('CSS326-24G-2S+');
	});

	it('normalizes plus signs when matching catalog models', () => {
		expect(findPortLayout('RB5009UG+S+IN')?.model).toBe('RB5009UG+S+IN');
	});

	it('falls back to natural left-to-right interface order for unknown models', () => {
		const layout = resolveDevicePortLayout('Unknown box', [
			iface('ether10'),
			iface('ether2'),
			iface('ether1')
		]);

		expect(layout.source).toBe('fallback');
		expect(layout.groups[0].rows[0].map((port) => port.name)).toEqual([
			'ether1',
			'ether2',
			'ether10'
		]);
	});

	it('matches collected interfaces onto model layout ports case-insensitively', () => {
		const layout = resolveDevicePortLayout('hEX', [
			iface('Ether1', { running: true, macAddress: 'AA:BB:CC:DD:EE:FF' }),
			iface('ether2', { disabled: true })
		]);
		const ports = layout.groups.flatMap((group) => group.rows.flat());

		expect(layout.source).toBe('model');
		expect(ports.find((port) => port.name === 'ether1')?.state).toBe('active');
		expect(ports.find((port) => port.name === 'ether1')?.interface?.macAddress).toBe(
			'AA:BB:CC:DD:EE:FF'
		);
		expect(ports.find((port) => port.name === 'ether2')?.state).toBe('disabled');
		expect(ports.find((port) => port.name === 'ether3')?.state).toBe('uncollected');
	});

	it('resolves the same physical layout data for compact and full renderers to share', () => {
		const layout = resolveDevicePortLayout('CRS112-8P-4S-IN', [iface('ether1')]);
		const groupIds = layout.groups.map((group) => group.id);
		const rows = layout.groups.map((group) => group.rows.map((row) => row.map((port) => port.name)));

		expect(groupIds).toEqual(['poe', 'sfp']);
		expect(rows).toEqual([
			[
				['ether1', 'ether3', 'ether5', 'ether7'],
				['ether2', 'ether4', 'ether6', 'ether8']
			],
			[['sfp1', 'sfp2', 'sfp3', 'sfp4']]
		]);
	});
});
