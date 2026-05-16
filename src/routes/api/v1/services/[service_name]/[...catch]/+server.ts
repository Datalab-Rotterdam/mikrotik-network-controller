import { ServiceManager } from '@sourceregistry/sveltekit-service-manager/server';
import '$lib/server/services/devices.service';
import '$lib/server/services/agent.service';

const { endpoint, access } = ServiceManager.Base();

export const { GET, PUT, POST, DELETE, PATCH, HEAD } = endpoint;

access('devices', 'agent');
