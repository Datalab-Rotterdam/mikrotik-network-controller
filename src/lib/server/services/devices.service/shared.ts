export type DeviceState = 'pending' | 'approved' | 'managed' | 'error';

export interface DeviceRecord {
	id: string;
	siteId: string | null;
	name: string;
	platform: 'routeros' | 'switchos';
	adoptionMode: 'read_only' | 'managed';
	adoptionState: string;
	connectionStatus: string;
	host: string;
	apiPort: number;
	sshPort: number;
	identity: string | null;
	model: string | null;
	serialNumber: string | null;
	routerOsVersion: string | null;
	architecture: string | null;
	uptimeSeconds: number | null;
	capabilities: string[];
	tags: string[];
	lastSeenAt: string | null;
	lastSyncAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface EnrollInput {
	serial: string;
	model: string;
	identity: string;
	version?: string | null;
	token?: string | null;
}

export interface AckInput {
	serial: string;
	restUser: string;
	restPassword: string;
	managedUser: string;
}
