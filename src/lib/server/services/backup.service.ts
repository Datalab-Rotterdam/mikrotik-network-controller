import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { RouterOSClient } from '@sourceregistry/mikrotik-client/routeros';
import { getDeviceCredentials } from '$lib/server/repositories/telemetry.repository';
import { getDeviceById } from '$lib/server/repositories/telemetry.repository';
import { decryptSecret } from '$lib/server/security/secrets';
import {
	createBackupRecord,
	deleteBackup,
	getBackup,
	getOldestBackupsForDevice,
	listBackupsForDevice
} from '$lib/server/repositories/backup.repository';

const DATA_DIR = '.data/backups';
const CLIENT_TIMEOUT_MS = 15_000;
const DEFAULT_KEEP = 10;

async function ensureBackupDir(deviceId: string): Promise<string> {
	const dir = join(DATA_DIR, deviceId);
	await mkdir(dir, { recursive: true });
	return dir;
}

export async function runExportBackup(
	deviceId: string,
	jobId?: string
): Promise<string> {
	const device = await getDeviceById(deviceId);
	if (!device) throw new Error(`Device ${deviceId} not found`);

	const credentials = await getDeviceCredentials(deviceId);
	// Prefer dedicated backup credential, then read_only (which has a real API password).
	// Skip 'write' credential — during managed adoption it stores 'ssh-key:controller'
	// which is an SSH-key marker, not a password usable for RouterOS API authentication.
	const cred = credentials.find((c) => c.purpose === 'backup') ?? credentials.find((c) => c.purpose === 'read_only');
	if (!cred) throw new Error('No credential available for backup');

	const client = new RouterOSClient({
		host: device.host,
		port: device.apiPort,
		username: cred.username,
		password: decryptSecret(cred.secretEncrypted),
		timeoutMs: CLIENT_TIMEOUT_MS
	});

	try {
		// /export returns the running config as text
		const result = await client.execute('/export', {}) as unknown;
		const text = typeof result === 'string'
			? result
			: JSON.stringify(result, null, 2);

		const now = new Date();
		const ts = now.toISOString().replace(/[:.]/g, '-');
		const dir = await ensureBackupDir(deviceId);
		const fileName = `${ts}.export`;
		const filePath = join(dir, fileName);

		await writeFile(filePath, text, 'utf-8');

		const sha256 = createHash('sha256').update(text).digest('hex');
		const sizeBytes = Buffer.byteLength(text, 'utf-8');

		const record = await createBackupRecord({
			deviceId,
			jobId: jobId ?? null,
			kind: 'export',
			filePath,
			sha256,
			sizeBytes,
			encrypted: false,
			restorePoint: false,
			collectedAt: now
		});

		await pruneOldBackups(deviceId, DEFAULT_KEEP);

		return record.id;
	} finally {
		await client.close().catch(() => {
		});
	}
}

export async function readBackupContent(backupId: string): Promise<string> {
	const record = await getBackup(backupId);
	if (!record) throw new Error('Backup not found');
	return readFile(record.filePath, 'utf-8');
}

async function pruneOldBackups(deviceId: string, keepCount: number): Promise<void> {
	const toDelete = await getOldestBackupsForDevice(deviceId, keepCount);
	for (const b of toDelete) {
		try {
			await unlink(b.filePath);
		} catch {
			// file may already be gone
		}
		await deleteBackup(b.id);
	}
}

export async function getDeviceBackups(deviceId: string) {
	return listBackupsForDevice(deviceId, 20);
}
