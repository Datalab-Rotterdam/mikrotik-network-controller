import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import env from '$lib/server/configurations/env.configuration';

const algorithm = 'aes-256-gcm';

function getKey(): Buffer {
	return createHash('sha256').update(env.CONTROLLER_SECRET).digest();
}

export function encryptSecret(value: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv(algorithm, getKey(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	const authTag = cipher.getAuthTag();

	return ['v1', iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join(
		':'
	);
}

export function decryptSecret(value: string): string {
	const [version, iv, authTag, encrypted] = value.split(':');

	if (version !== 'v1' || !iv || !authTag || !encrypted) {
		throw new Error('Unsupported secret format.');
	}

	const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(iv, 'base64url'));
	decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

	return Buffer.concat([
		decipher.update(Buffer.from(encrypted, 'base64url')),
		decipher.final()
	]).toString('utf8');
}
