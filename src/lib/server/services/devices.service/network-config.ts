import { RouterOSSshClient } from '@sourceregistry/mikrotik-client/routeros';
import { TelemetryRepository } from '$lib/server/repositories/telemetry.repository';
import { getControllerSshPrivateKeyPath } from '$lib/server/security/controller-ssh-keys';

const TIMEOUT_MS = 20_000;

function rosQuote(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function assertSafeRouterId(routerId: string): void {
	if (!/^\*[0-9A-Fa-f]+$/.test(routerId)) {
		throw new Error(`Invalid routerId format: ${routerId}`);
	}
}

async function buildSshClient(deviceId: string): Promise<RouterOSSshClient> {
	const device = await TelemetryRepository.getDeviceById(deviceId);
	if (!device) throw new Error(`Device ${deviceId} not found`);

	const credentials = await TelemetryRepository.getCredentials(deviceId);
	const writeCred = credentials.find((c) => c.purpose === 'write');
	if (!writeCred) throw new Error('No write credential — device must be managed');

	const keyPath = await getControllerSshPrivateKeyPath();
	return new RouterOSSshClient({
		host: device.host,
		username: writeCred.username,
		identityFile: keyPath,
		port: device.sshPort ?? 22,
		timeoutMs: TIMEOUT_MS
	});
}

export type FirewallRuleInput = {
	chain: 'input' | 'forward' | 'output';
	action: 'accept' | 'drop' | 'reject' | 'jump' | 'return' | 'passthrough' | 'log';
	srcAddress?: string | null;
	dstAddress?: string | null;
	protocol?: string | null;
	srcPort?: string | null;
	dstPort?: string | null;
	inInterface?: string | null;
	outInterface?: string | null;
	comment?: string | null;
	disabled?: boolean;
};

export async function addFirewallRule(deviceId: string, input: FirewallRuleInput): Promise<void> {
	const ssh = await buildSshClient(deviceId);
	const parts = ['/ip firewall filter add', `chain=${input.chain}`, `action=${input.action}`];
	if (input.srcAddress) parts.push(`src-address=${rosQuote(input.srcAddress)}`);
	if (input.dstAddress) parts.push(`dst-address=${rosQuote(input.dstAddress)}`);
	if (input.protocol) parts.push(`protocol=${input.protocol}`);
	if (input.srcPort) parts.push(`src-port=${rosQuote(input.srcPort)}`);
	if (input.dstPort) parts.push(`dst-port=${rosQuote(input.dstPort)}`);
	if (input.inInterface) parts.push(`in-interface=${rosQuote(input.inInterface)}`);
	if (input.outInterface) parts.push(`out-interface=${rosQuote(input.outInterface)}`);
	if (input.comment) parts.push(`comment=${rosQuote(input.comment)}`);
	if (input.disabled) parts.push('disabled=yes');
	await ssh.execute(parts.join(' '));
}

export async function deleteFirewallRule(deviceId: string, routerId: string): Promise<void> {
	assertSafeRouterId(routerId);
	const ssh = await buildSshClient(deviceId);
	await ssh.execute(`/ip firewall filter remove [find where .id=${routerId}]`);
}

export type VlanInput = {
	vlanId: number;
	name: string;
	interfaceName: string;
	comment?: string | null;
};

export async function addVlan(deviceId: string, input: VlanInput): Promise<void> {
	const ssh = await buildSshClient(deviceId);
	const parts = [
		'/interface vlan add',
		`vlan-id=${input.vlanId}`,
		`name=${rosQuote(input.name)}`,
		`interface=${rosQuote(input.interfaceName)}`
	];
	if (input.comment) parts.push(`comment=${rosQuote(input.comment)}`);
	await ssh.execute(parts.join(' '));
}

export async function deleteVlan(deviceId: string, routerId: string): Promise<void> {
	assertSafeRouterId(routerId);
	const ssh = await buildSshClient(deviceId);
	await ssh.execute(`/interface vlan remove [find where .id=${routerId}]`);
}

export type PortConfigInput = {
	disabled?: boolean;
	comment?: string | null;
	pvid?: number | null;
	frameTypes?: string | null;
	bridge?: string | null;
};

export async function configurePort(
	deviceId: string,
	portName: string,
	config: PortConfigInput
): Promise<void> {
	const ssh = await buildSshClient(deviceId);
	const safeName = rosQuote(portName);

	const ifaceParts = [`/interface set [find name=${safeName}]`];
	if (config.disabled !== undefined) ifaceParts.push(`disabled=${config.disabled ? 'yes' : 'no'}`);
	if (config.comment !== undefined) ifaceParts.push(`comment=${rosQuote(config.comment ?? '')}`);
	if (ifaceParts.length > 1) await ssh.execute(ifaceParts.join(' '));

	if (config.bridge && (config.pvid !== undefined || config.frameTypes !== undefined)) {
		const bpParts = [`/interface bridge port set [find interface=${safeName}]`];
		if (config.pvid !== undefined && config.pvid !== null) bpParts.push(`pvid=${config.pvid}`);
		if (config.frameTypes) bpParts.push(`frame-types=${rosQuote(config.frameTypes)}`);
		if (bpParts.length > 1) await ssh.execute(bpParts.join(' '));
	}
}
