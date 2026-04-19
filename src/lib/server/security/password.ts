import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const keyLength = 64;

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, keyLength).toString('hex');

	return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedPasswordHash: string): boolean {
	const [algorithm, salt, storedHash] = storedPasswordHash.split(':');

	if (algorithm !== 'scrypt' || !salt || !storedHash) {
		return false;
	}

	const candidateHash = scryptSync(password, salt, keyLength);
	const storedHashBuffer = Buffer.from(storedHash, 'hex');

	if (candidateHash.length !== storedHashBuffer.length) {
		return false;
	}

	return timingSafeEqual(candidateHash, storedHashBuffer);
}
