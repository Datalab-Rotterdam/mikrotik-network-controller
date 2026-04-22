import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

let tempDir: string | undefined;

afterEach(async () => {
	vi.unstubAllEnvs();
	vi.resetModules();

	if (tempDir) {
		await rm(tempDir, { recursive: true, force: true });
		tempDir = undefined;
	}
});

describe('controller SSH key material', () => {
	it('generates a private key and an OpenSSH public key for RouterOS import', async () => {
		vi.resetModules();
		tempDir = await mkdtemp(join(tmpdir(), 'mnc-controller-ssh-'));
		const privateKeyPath = join(tempDir, 'controller_ssh');
		const publicKeyPath = join(tempDir, 'controller_ssh.pub');

		vi.stubEnv('CONTROLLER_SSH_PRIVATE_KEY', privateKeyPath);
		vi.stubEnv('CONTROLLER_SSH_PUBLIC_KEY', publicKeyPath);

		const { ensureControllerSshKeyPair } = await import('./controller-ssh-keys');
		const keyPair = await ensureControllerSshKeyPair();
		const privateKeyStats = await stat(privateKeyPath);

		await expect(readFile(privateKeyPath, 'utf8')).resolves.toContain('PRIVATE KEY');
		await expect(readFile(publicKeyPath, 'utf8')).resolves.toContain('ssh-rsa ');
		expect(privateKeyStats.mode & 0o777).toBe(0o600);
		expect(keyPair.publicKey).toMatch(/^ssh-rsa [A-Za-z0-9+/=]+ controller@mikrotik-network-controller$/);
	});
});
