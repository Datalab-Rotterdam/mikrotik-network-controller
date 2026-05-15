import { BackupRepository } from '$lib/server/repositories/backup.repository';

export async function getDeviceBackups(deviceId: string) {
	return BackupRepository.listByDevice(deviceId, 20);
}
