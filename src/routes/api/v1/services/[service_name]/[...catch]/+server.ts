import { ServiceManager } from '@sourceregistry/sveltekit-service-manager/server';

const { endpoint, access } = ServiceManager.Base();

/**
 * Look for implementation in the $lib/server/services folder
 */
export const { GET, PUT, POST, DELETE, PATCH, HEAD } = endpoint;

/**
 * This the services calls are restricted to only these services
 */
access('devices');
