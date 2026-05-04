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

type NamedActionEvents<T extends Record<string, { type: string }>> = {
	[EventName in keyof T]: T[EventName] & { type: EventName };
};

export type SiteActionEventMap = NamedActionEvents<App.ActionEvents['site:${string}']>;
export type DiscoveryActionEventMap = NamedActionEvents<App.ActionEvents['discovery']>;
export type ActionEventMap = SiteActionEventMap & DiscoveryActionEventMap;
export type ActionEventType = Extract<keyof ActionEventMap, string>;
export type ActionEvent = SiteActionEventMap[keyof SiteActionEventMap] | DiscoveryActionEventMap[keyof DiscoveryActionEventMap];
export type JobSnapshotEvent = SiteActionEventMap['job.snapshot'];
export type JobUpdatedEvent = SiteActionEventMap['job.updated'];
export type DiscoverySnapshotEvent = DiscoveryActionEventMap['discovery.snapshot'];
export type DiscoveryNeighborEvent = DiscoveryActionEventMap['discovery.neighbor'];
export type DeviceAdoptedEvent = SiteActionEventMap['device.adopted'] | DiscoveryActionEventMap['device.adopted'];
export type DeviceUpdatedEvent = SiteActionEventMap['device.updated'];
export type DeviceRemovedEvent = SiteActionEventMap['device.removed'];
export type MetricUpdatedEvent = SiteActionEventMap['metric.updated'];
export type ClientUpdatedEvent = SiteActionEventMap['client.updated'];
export type AlertFiredEvent = SiteActionEventMap['alert.fired'];
export type AlertResolvedEvent = SiteActionEventMap['alert.resolved'];
export type TopologyUpdatedEvent = SiteActionEventMap['topology.updated'];
