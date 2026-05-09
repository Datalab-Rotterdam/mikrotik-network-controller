import {runExportBackup} from '$lib/server/services/backup.service';
import type {TaskDefinition} from '$lib/server/services/scheduler.service/types';

export function createBackupDeviceTask(deviceId: string, siteId?: string): TaskDefinition<{deviceId: string}> {
	return {
		name: 'devices.backup',
		deviceId,
		siteId: siteId ?? null,
		payload: {deviceId},
		failurePolicy: 'stop',
		steps: [
			{
				name: 'Export running configuration',
				async execute({jobId}) {
					const backupId = await runExportBackup(deviceId, jobId);
					return {message: 'Export backup saved', data: {backupId}};
				}
			}
		]
	};
}
