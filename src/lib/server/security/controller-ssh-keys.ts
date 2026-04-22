import { createPublicKey } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { openssl } from '@sourceregistry/node-openssl';
import env from '$lib/server/configurations/env.configuration';

export type ControllerSshKeyPair = {
	privateKeyPath: string;
	publicKeyPath: string;
	publicKey: string;
};

function resolveConfiguredPath(path: string): string {
	return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

function base64UrlToBuffer(value: string): Buffer {
	return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function sshString(value: string | Buffer): Buffer {
	const body = Buffer.isBuffer(value) ? value : Buffer.from(value);
	const length = Buffer.alloc(4);
	length.writeUInt32BE(body.length, 0);

	return Buffer.concat([length, body]);
}

function sshMpint(value: Buffer): Buffer {
	const firstNonZero = value.findIndex((byte) => byte !== 0);
	const withoutLeadingZeroes = firstNonZero === -1 ? Buffer.from([0]) : value.subarray(firstNonZero);
	const body = withoutLeadingZeroes.length === 0 ? Buffer.from([0]) : withoutLeadingZeroes;
	const normalized = (body[0] & 0x80) === 0x80 ? Buffer.concat([Buffer.from([0]), body]) : body;

	return sshString(normalized);
}

function privateKeyPemToOpenSshPublicKey(privateKeyPem: string): string {
	const publicKey = createPublicKey(privateKeyPem);
	const jwk = publicKey.export({ format: 'jwk' });

	if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
		throw new Error('Controller SSH key must be an RSA key');
	}

	const blob = Buffer.concat([
		sshString('ssh-rsa'),
		sshMpint(base64UrlToBuffer(jwk.e)),
		sshMpint(base64UrlToBuffer(jwk.n))
	]);

	return `ssh-rsa ${blob.toString('base64')} controller@mikrotik-network-controller`;
}

export async function ensureControllerSshKeyPair(): Promise<ControllerSshKeyPair> {
	const privateKeyPath = resolveConfiguredPath(
		process.env.CONTROLLER_SSH_PRIVATE_KEY ?? env.CONTROLLER_SSH_PRIVATE_KEY
	);
	const publicKeyPath = resolveConfiguredPath(
		process.env.CONTROLLER_SSH_PUBLIC_KEY ?? env.CONTROLLER_SSH_PUBLIC_KEY
	);

	await mkdir(dirname(privateKeyPath), { recursive: true });
	await mkdir(dirname(publicKeyPath), { recursive: true });

	if (!existsSync(privateKeyPath)) {
		const privateKey = await openssl`genpkey -algorithm RSA -outform PEM -pkeyopt rsa_keygen_bits:4096`.one();
		await writeFile(privateKeyPath, privateKey.toString('utf8'), { mode: 0o600 });
		await chmod(privateKeyPath, 0o600);
	}

	const privateKeyPem = await readFile(privateKeyPath, 'utf8');
	const publicKey = privateKeyPemToOpenSshPublicKey(privateKeyPem);

	if (!existsSync(publicKeyPath) || (await readFile(publicKeyPath, 'utf8')).trim() !== publicKey) {
		await writeFile(publicKeyPath, `${publicKey}\n`, { mode: 0o644 });
	}

	return {
		privateKeyPath,
		publicKeyPath,
		publicKey
	};
}

export async function getControllerSshPrivateKeyPath(): Promise<string> {
	return (await ensureControllerSshKeyPair()).privateKeyPath;
}

export async function getControllerSshKnownHostsPath(): Promise<string> {
	const keyPair = await ensureControllerSshKeyPair();
	const knownHostsPath = join(dirname(keyPair.privateKeyPath), 'controller_known_hosts');

	await mkdir(dirname(knownHostsPath), { recursive: true });
	if (!existsSync(knownHostsPath)) {
		await writeFile(knownHostsPath, '', { mode: 0o600 });
		await chmod(knownHostsPath, 0o600);
	}

	return knownHostsPath;
}

export async function getControllerSshPublicKey(): Promise<string> {
	return (await ensureControllerSshKeyPair()).publicKey;
}
