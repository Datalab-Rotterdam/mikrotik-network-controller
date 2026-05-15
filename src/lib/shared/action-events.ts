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

export type DeviceUpdateReason =
	| 'adoption'
	| 'enrollment'
	| 'provisioning'
	| 'telemetry'
	| 'interfaces'
	| 'credentials'
	| 'removal';

export type ActionDeviceUpdatedPayload = {
	siteId: string | null;
	deviceId: string;
	reason: DeviceUpdateReason;
	connectionStatus?: 'unknown' | 'online' | 'offline' | 'auth_failed' | 'blocked';
	timestamp: string;
};

export type ActionDeviceRemovedPayload = {
	siteId: string | null;
	deviceId: string;
	timestamp: string;
};

export type DeviceMetricPayload = {
	deviceId: string;
	siteId: string | null;
	cpuPercent: number | null;
	freeMemoryBytes: number | null;
	totalMemoryBytes: number | null;
	temperatureCelsius: number | null;
	uptimeSeconds: number | null;
	collectedAt: string;
};

export type ClientUpdatedPayload = {
	siteId: string | null;
	activeCount: number;
};

export type AlertFiredPayload = {
	eventId: string;
	ruleId: string;
	siteId: string;
	deviceId: string | null;
	severity: string;
	message: string;
};

export type AlertResolvedPayload = {
	eventId: string;
	ruleId: string;
	siteId: string;
	deviceId: string | null;
};

export type TopologyUpdatedPayload = {
	siteId: string;
};

export type SyslogEventPayload = {
	siteId: string;
	id: string;
	severity: string;
	category: string;
	title: string;
	message: string;
	deviceId: string | null;
	createdAt: string;
};

type SiteChannelMap = App.ActionEvents['site:${string}'];
type DiscoveryChannelMap = App.ActionEvents['discovery'];

export type ActionEvent =
	| { [K in keyof SiteChannelMap]: { type: K; payload: SiteChannelMap[K] } }[keyof SiteChannelMap]
	| { [K in keyof DiscoveryChannelMap]: { type: K; payload: DiscoveryChannelMap[K] } }[keyof DiscoveryChannelMap];

export type ActionEventType = ActionEvent['type'];

