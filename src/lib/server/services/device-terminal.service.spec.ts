import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isDeviceTerminalEligible, startDeviceTerminalSession } from './device-terminal.service';

const mocks = vi.hoisted(() => ({
	getControllerSshPrivateKeyPath: vi.fn(),
	getControllerSshKnownHostsPath: vi.fn(),
	recordAuditEvent: vi.fn()
}));

vi.mock('$lib/server/security/controller-ssh-keys', () => ({
	getControllerSshPrivateKeyPath: mocks.getControllerSshPrivateKeyPath,
	getControllerSshKnownHostsPath: mocks.getControllerSshKnownHostsPath
}));

vi.mock('$lib/server/repositories/audit.repository', () => ({
	recordAuditEvent: mocks.recordAuditEvent
}));

class FakeSocket extends EventEmitter {
	OPEN = 1;
	readyState = 1;
	sent: string[] = [];

	send(data: string) {
		this.sent.push(data);
	}
}

function makeProcess() {
	const process = new EventEmitter() as EventEmitter & {
		stdin: PassThrough;
		stdout: PassThrough;
		stderr: PassThrough;
		killed: boolean;
		kill: ReturnType<typeof vi.fn>;
	};
	process.stdin = new PassThrough();
	process.stdout = new PassThrough();
	process.stderr = new PassThrough();
	process.killed = false;
	process.kill = vi.fn(() => {
		process.killed = true;
		return true;
	});

	return process;
}

const device = {
	id: 'device-1',
	host: '192.168.88.1',
	sshPort: 22,
	identity: 'core-router',
	name: 'Core router'
};

beforeEach(() => {
	vi.clearAllMocks();
	mocks.getControllerSshPrivateKeyPath.mockResolvedValue('/tmp/controller_ssh');
	mocks.getControllerSshKnownHostsPath.mockResolvedValue('/tmp/controller_known_hosts');
	mocks.recordAuditEvent.mockResolvedValue(undefined);
});

describe('isDeviceTerminalEligible', () => {
	it('requires admin, managed RouterOS, and a write credential', () => {
		expect(
			isDeviceTerminalEligible({
				userRoles: ['admin'],
				device: {
					platform: 'routeros',
					adoptionMode: 'managed',
					adoptionState: 'fully_managed'
				},
				writeCredential: { id: 'credential-1' }
			})
		).toBe(true);

		expect(
			isDeviceTerminalEligible({
				userRoles: [],
				device: {
					platform: 'routeros',
					adoptionMode: 'managed',
					adoptionState: 'fully_managed'
				},
				writeCredential: { id: 'credential-1' }
			})
		).toBe(false);

		expect(
			isDeviceTerminalEligible({
				userRoles: ['admin'],
				device: {
					platform: 'switchos',
					adoptionMode: 'managed',
					adoptionState: 'fully_managed'
				},
				writeCredential: { id: 'credential-1' }
			})
		).toBe(false);

		expect(
			isDeviceTerminalEligible({
				userRoles: ['admin'],
				device: {
					platform: 'routeros',
					adoptionMode: 'read_only',
					adoptionState: 'monitored'
				},
				writeCredential: { id: 'credential-1' }
			})
		).toBe(false);

		expect(
			isDeviceTerminalEligible({
				userRoles: ['admin'],
				device: {
					platform: 'routeros',
					adoptionMode: 'managed',
					adoptionState: 'fully_managed'
				}
			})
		).toBe(false);
	});
});

describe('startDeviceTerminalSession', () => {
	it('spawns ssh, forwards terminal input, output, and closes cleanly', async () => {
		const socket = new FakeSocket();
		const process = makeProcess();
		const spawnSsh = vi.fn(() => process);
		const stdinChunks: string[] = [];
		process.stdin.on('data', (chunk) => stdinChunks.push(chunk.toString('utf8')));

		await startDeviceTerminalSession({
			socket: socket as never,
			device,
			credential: { username: 'mt-managed' },
			userId: 'user-1',
			spawnSsh: spawnSsh as never,
			idleTimeoutMs: 30_000
		});

		expect(spawnSsh).toHaveBeenCalledWith(
			'ssh',
			expect.arrayContaining([
				'-tt',
				'-p',
				'22',
				'-i',
				'/tmp/controller_ssh',
				'-o',
				'UserKnownHostsFile=/tmp/controller_known_hosts',
				'-o',
				'HostKeyAlias=mnc-device-device-1',
				'mt-managed@192.168.88.1'
			]),
			expect.objectContaining({
				env: expect.objectContaining({
					TERM: 'xterm-256color'
				})
			})
		);

		socket.emit('message', JSON.stringify({ type: 'input', data: '/system/resource/print\r' }));
		process.stdout.write('uptime: 1h\r\n');
		process.emit('close', 0, null);

		expect(stdinChunks.join('')).toContain('/system/resource/print\r');
		expect(socket.sent.map((item) => JSON.parse(item))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'status', status: 'connecting' }),
				expect.objectContaining({ type: 'status', status: 'connected' }),
				expect.objectContaining({ type: 'output', data: 'uptime: 1h\r\n' }),
				expect.objectContaining({ type: 'status', status: 'closed' })
			])
		);
		expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'terminal.opened',
				actorUserId: 'user-1',
				targetDeviceId: 'device-1'
			})
		);
		expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'terminal.closed',
				actorUserId: 'user-1',
				targetDeviceId: 'device-1'
			})
		);
	});

	it('records failures when ssh cannot be started', async () => {
		const socket = new FakeSocket();
		const spawnSsh = vi.fn(() => {
			throw new Error('ssh unavailable');
		});

		await startDeviceTerminalSession({
			socket: socket as never,
			device,
			credential: { username: 'mt-managed' },
			userId: 'user-1',
			spawnSsh: spawnSsh as never,
			idleTimeoutMs: 30_000
		});

		expect(socket.sent.map((item) => JSON.parse(item))).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ type: 'status', status: 'failed', message: 'ssh unavailable' })
			])
		);
		expect(mocks.recordAuditEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'terminal.failed',
				metadata: expect.objectContaining({
					error: 'ssh unavailable'
				})
			})
		);
	});
});
