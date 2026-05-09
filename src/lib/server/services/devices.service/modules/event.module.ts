import {OpenEventEmitter} from "$lib/server/helpers/OpenEventEmitter";

export type DeviceUpdateReason =
    | 'adoption'
    | 'enrollment'
    | 'provisioning'
    | 'telemetry'
    | 'interfaces'
    | 'credentials'
    | 'removal';

export type DeviceAdoptedPayload = {
    host: string;
    deviceId: string | null;
    siteId: string;
    siteName: string;
    identity?: string;
    platform?: string;
    timestamp: string;
};
export type DeviceRemovedPayload = {
    siteId: string | null;
    deviceId: string;
    timestamp: string;
};
export type DeviceUpdatedPayload = {
    siteId: string | null;
    deviceId: string;
    reason: DeviceUpdateReason;
    connectionStatus?: 'unknown' | 'online' | 'offline' | 'auth_failed' | 'blocked';
    timestamp: string;
};

export type DeviceEventMap = {
    'device.adopted': [DeviceAdoptedPayload];
    'device.updated': [DeviceUpdatedPayload];
    'device.removed': [DeviceRemovedPayload];
}

const eventEmitter = new OpenEventEmitter<DeviceEventMap>();

export default eventEmitter;
