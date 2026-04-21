export type JobStatus =
	| 'queued'
	| 'running'
	| 'succeeded'
	| 'failed'
	| 'cancelled'
	| 'rolling_back'
	| 'reverted'
	| 'revert_failed'
	| 'needs_attention';

export type JobStepStatus =
	| 'queued'
	| 'running'
	| 'succeeded'
	| 'failed'
	| 'reverting'
	| 'reverted'
	| 'revert_failed'
	| 'revert_skipped';

export type ActionJobStep = {
	id: string;
	jobId: string;
	index: number;
	name: string;
	status: JobStepStatus;
	result: Record<string, unknown>;
	errorMessage: string | null;
	revertResult: Record<string, unknown> | null;
	revertErrorMessage: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	revertedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ActionJob = {
	id: string;
	type: string;
	status: JobStatus;
	deviceId: string | null;
	siteId: string | null;
	requestedByUserId: string | null;
	progress: number;
	attemptCount: number;
	maxAttempts: number;
	payload: Record<string, unknown>;
	result: Record<string, unknown> | null;
	errorMessage: string | null;
	scheduledFor: string | null;
	lockedAt: string | null;
	lockedBy: string | null;
	startedAt: string | null;
	finishedAt: string | null;
	createdAt: string;
	updatedAt: string;
	steps: ActionJobStep[];
};

export type ActionDiscoveryDevice = {
	id: string;
	identity?: string | null;
	macAddress?: string | null;
	platform?: string | null;
	version?: string | null;
	hardware?: string | null;
	interfaceName?: string | null;
	address?: string | null;
};

export type ActionDeviceAdoptedPayload = {
	host: string;
	deviceId: string;
	siteId: string;
	siteName: string;
	identity?: string;
	platform?: string;
	timestamp: string;
};

export type ActionEventMap = App.ActionEvents;
export type ActionEventType = keyof ActionEventMap;
export type ActionEvent = ActionEventMap[ActionEventType];
export type JobSnapshotEvent = ActionEventMap['job.snapshot'];
export type JobUpdatedEvent = ActionEventMap['job.updated'];
export type DiscoverySnapshotEvent = ActionEventMap['discovery.snapshot'];
export type DiscoveryNeighborEvent = ActionEventMap['discovery.neighbor'];
export type DeviceAdoptedEvent = ActionEventMap['device.adopted'];
