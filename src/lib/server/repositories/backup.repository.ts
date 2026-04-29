import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { backups } from '$lib/server/db/schema';

export type BackupInsert = typeof backups.$inferInsert;

export async function createBackupRecord(
	input: Omit<BackupInsert, 'id' | 'createdAt'>
) {
	const [row] = await db.insert(backups).values(input).returning();
	return row;
}

export async function listBackupsForDevice(deviceId: string, limit = 20) {
	return db
		.select()
		.from(backups)
		.where(eq(backups.deviceId, deviceId))
		.orderBy(desc(backups.collectedAt))
		.limit(limit);
}

export async function getBackup(id: string) {
	const [row] = await db.select().from(backups).where(eq(backups.id, id));
	return row ?? null;
}

export async function deleteBackup(id: string) {
	await db.delete(backups).where(eq(backups.id, id));
}

export async function countBackupsForDevice(deviceId: string): Promise<number> {
	const rows = await db.select().from(backups).where(eq(backups.deviceId, deviceId));
	return rows.length;
}

export async function getOldestBackupsForDevice(deviceId: string, keepCount: number) {
	const all = await db
		.select()
		.from(backups)
		.where(and(eq(backups.deviceId, deviceId), eq(backups.restorePoint, false)))
		.orderBy(desc(backups.collectedAt));

	return all.slice(keepCount);
}
