import {type Service, ServiceManager} from '@sourceregistry/sveltekit-service-manager';
import {Scheduler} from './types';

export const service = {
    name: 'scheduler',
    local: new Scheduler()
} satisfies Service<'scheduler'>;

export type SchedulerService = typeof service;

export default ServiceManager.Load(service, import.meta);
