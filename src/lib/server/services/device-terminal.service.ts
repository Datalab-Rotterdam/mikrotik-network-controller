import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { ReferencedWebSocket } from '@sourceregistry/sveltekit-websockets/server';
import { recordAuditEvent } from '$lib/server/repositories/audit.repository';
import {
	getControllerSshKnownHostsPath,
	getControllerSshPrivateKeyPath
} from '$lib/server/security/controller-ssh-keys';
import type { TerminalClientMessage, TerminalServerMessage } from '$lib/shared/terminal';

type TerminalDevice = {
	id: string;
	host: string;
	sshPort: number;
	identity: string | null;
	name: string;
};

type TerminalCredential = {
	username: string;
};

export type TerminalSessionInput = {
	socket: ReferencedWebSocket;
	device: TerminalDevice;
	credential: TerminalCredential;
	userId: string;
	spawnSsh?: typeof spawn;
	idleTimeoutMs?: number;
};

function send(socket: ReferencedWebSocket, message: TerminalServerMessage): void {
	if (socket.readyState === socket.OPEN) {
		socket.send(JSON.stringify(message));
	}
}

function parseClientMessage(data: unknown): TerminalClientMessage | null {
	const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);

	try {
		const message: unknown = JSON.parse(text);
		if (typeof message !== 'object' || message === null || !('type' in message)) {
			return null;
		}

		if (message.type === 'input' && 'data' in message && typeof message.data === 'string') {
			return {
				type: 'input',
				data: message.data
			};
		}

		if (
			message.type === 'resize' &&
			'cols' in message &&
			'rows' in message &&
			typeof message.cols === 'number' &&
			typeof message.rows === 'number' &&
			Number.isInteger(message.cols) &&
			Number.isInteger(message.rows)
		) {
			return {
				type: 'resize',
				cols: Math.max(20, Math.min(240, message.cols)),
				rows: Math.max(8, Math.min(80, message.rows))
			};
		}

		if (message.type === 'close') {
			return { type: 'close' };
		}
	} catch {
		return null;
	}

	return null;
}

function buildSshArgs(input: {
	host: string;
	port: number;
	username: string;
	identityFile: string;
	knownHostsFile: string;
	hostKeyAlias: string;
}): string[] {
	return [
		'-tt',
		'-p',
		String(input.port),
		'-i',
		input.identityFile,
		'-o',
		`UserKnownHostsFile=${input.knownHostsFile}`,
		'-o',
		`HostKeyAlias=${input.hostKeyAlias}`,
		'-o',
		'BatchMode=yes',
		'-o',
		'StrictHostKeyChecking=accept-new',
		'-o',
		'ServerAliveInterval=30',
		`${input.username}@${input.host}`
	];
}

export async function startDeviceTerminalSession(input: TerminalSessionInput): Promise<void> {
	const identityFile = await getControllerSshPrivateKeyPath();
	const knownHostsFile = await getControllerSshKnownHostsPath();
	const spawnSsh = input.spawnSsh ?? spawn;
	const idleTimeoutMs = input.idleTimeoutMs ?? 10 * 60 * 1000;
	const startedAt = new Date();
	let closed = false;
	let lastSize = { cols: 80, rows: 24 };
	let idleTimer: NodeJS.Timeout | undefined;
	let ssh: ChildProcessWithoutNullStreams | undefined;

	const closeSession = (reason: string) => {
		if (closed) {
			return;
		}

		closed = true;
		if (idleTimer) {
			clearTimeout(idleTimer);
		}

		if (ssh && !ssh.killed) {
			ssh.kill();
		}

		send(input.socket, {
			type: 'status',
			status: 'closed',
			message: reason
		});

		void recordAuditEvent({
			actorUserId: input.userId,
			targetDeviceId: input.device.id,
			action: 'terminal.closed',
			message: `Terminal session closed for ${input.device.identity ?? input.device.name}`,
			metadata: {
				host: input.device.host,
				sshPort: input.device.sshPort,
				startedAt: startedAt.toISOString(),
				reason
			}
		});
	};

	const resetIdleTimer = () => {
		if (idleTimer) {
			clearTimeout(idleTimer);
		}

		idleTimer = setTimeout(() => closeSession('Terminal session timed out.'), idleTimeoutMs);
		idleTimer.unref?.();
	};

	try {
		send(input.socket, {
			type: 'status',
			status: 'connecting',
			message: `Connecting to ${input.device.host}:${input.device.sshPort}...`
		});

		ssh = spawnSsh(
			'ssh',
			buildSshArgs({
				host: input.device.host,
					port: input.device.sshPort,
					username: input.credential.username,
					identityFile,
					knownHostsFile,
					hostKeyAlias: `mnc-device-${input.device.id}`
				}),
			{
				env: {
					...process.env,
					TERM: 'xterm-256color',
					COLUMNS: String(lastSize.cols),
					LINES: String(lastSize.rows)
				}
			}
		);

		await recordAuditEvent({
			actorUserId: input.userId,
			targetDeviceId: input.device.id,
			action: 'terminal.opened',
			message: `Terminal session opened for ${input.device.identity ?? input.device.name}`,
			metadata: {
				host: input.device.host,
				sshPort: input.device.sshPort,
				username: input.credential.username
			}
		});

		send(input.socket, {
			type: 'status',
			status: 'connected',
			message: 'Connected.'
		});

		ssh.stdout.on('data', (chunk: Buffer) => {
			send(input.socket, { type: 'output', data: chunk.toString('utf8') });
		});

		ssh.stderr.on('data', (chunk: Buffer) => {
			send(input.socket, { type: 'output', data: chunk.toString('utf8') });
		});

		ssh.once('error', (error) => {
			send(input.socket, {
				type: 'status',
				status: 'failed',
				message: error.message
			});
			void recordAuditEvent({
				actorUserId: input.userId,
				targetDeviceId: input.device.id,
				action: 'terminal.failed',
				message: `Terminal session failed for ${input.device.identity ?? input.device.name}`,
				metadata: {
					host: input.device.host,
					sshPort: input.device.sshPort,
					error: error.message
				}
			});
			closeSession('SSH process failed.');
		});

		ssh.once('close', (code, signal) => {
			closeSession(code === 0 ? 'SSH session ended.' : `SSH session ended with code ${code ?? signal}.`);
		});

		input.socket.on('message', (data) => {
			resetIdleTimer();
			const message = parseClientMessage(data);
			if (!message || !ssh) {
				return;
			}

			if (message.type === 'input') {
				ssh.stdin.write(message.data);
				return;
			}

			if (message.type === 'resize') {
				lastSize = {
					cols: message.cols,
					rows: message.rows
				};
				return;
			}

			closeSession('Closed by browser.');
		});

		input.socket.once('close', () => closeSession('Browser connection closed.'));
		input.socket.once('error', () => closeSession('Browser connection failed.'));
		resetIdleTimer();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		send(input.socket, {
			type: 'status',
			status: 'failed',
			message
		});
		await recordAuditEvent({
			actorUserId: input.userId,
			targetDeviceId: input.device.id,
			action: 'terminal.failed',
			message: `Terminal session failed for ${input.device.identity ?? input.device.name}`,
			metadata: {
				host: input.device.host,
				sshPort: input.device.sshPort,
				error: message
			}
		});
		closeSession('Terminal setup failed.');
	}
}

export function isDeviceTerminalEligible(input: {
	userRoles: string[];
	device: {
		platform: string;
		adoptionMode: string;
		adoptionState: string;
	};
	writeCredential?: unknown;
}): boolean {
	return (
		input.userRoles.includes('admin') &&
		input.device.platform === 'routeros' &&
		(input.device.adoptionMode === 'managed' || input.device.adoptionState === 'fully_managed') &&
		Boolean(input.writeCredential)
	);
}
