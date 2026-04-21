import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
	getCurrentStep,
	getJobsForDevice,
	jobsState,
	processJobActionEvent,
	setJobsSnapshot
} from './jobs';
import type { ActionJob } from '$lib/shared/action-events';

function makeJob(patch: Partial<ActionJob> = {}): ActionJob {
	return {
		id: patch.id ?? 'job-1',
		type: patch.type ?? 'sync',
		status: patch.status ?? 'queued',
		deviceId: patch.deviceId ?? 'device-1',
		siteId: patch.siteId ?? 'site-1',
		requestedByUserId: null,
		progress: patch.progress ?? 0,
		attemptCount: 0,
		maxAttempts: 1,
		payload: {},
		result: null,
		errorMessage: null,
		scheduledFor: null,
		lockedAt: null,
		lockedBy: null,
		startedAt: null,
		finishedAt: null,
		createdAt: patch.createdAt ?? '2026-01-01T00:00:00.000Z',
		updatedAt: patch.updatedAt ?? '2026-01-01T00:00:00.000Z',
		steps: patch.steps ?? []
	};
}

describe('jobs store', () => {
	beforeEach(() => {
		setJobsSnapshot([]);
	});

	it('sorts snapshots newest first', () => {
		setJobsSnapshot([
			makeJob({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' }),
			makeJob({ id: 'newer', createdAt: '2026-01-02T00:00:00.000Z' })
		]);

		expect(get(jobsState).jobs.map((job) => job.id)).toEqual(['newer', 'older']);
	});

	it('merges job updates by id', () => {
		setJobsSnapshot([makeJob({ id: 'job-1', progress: 10 })]);

		processJobActionEvent({
			type: 'job.updated',
			payload: {
				siteId: 'site-1',
				job: makeJob({ id: 'job-1', progress: 75, status: 'running' })
			}
		});

		expect(get(jobsState).jobs).toHaveLength(1);
		expect(get(jobsState).jobs[0].progress).toBe(75);
		expect(get(jobsState).jobs[0].status).toBe('running');
	});

	it('filters jobs by device and identifies current step', () => {
		const job = makeJob({
			steps: [
				{
					id: 'step-1',
					jobId: 'job-1',
					index: 0,
					name: 'Inventory',
					status: 'succeeded',
					result: {},
					errorMessage: null,
					revertResult: null,
					revertErrorMessage: null,
					startedAt: null,
					finishedAt: null,
					revertedAt: null,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				},
				{
					id: 'step-2',
					jobId: 'job-1',
					index: 1,
					name: 'Backup',
					status: 'running',
					result: {},
					errorMessage: null,
					revertResult: null,
					revertErrorMessage: null,
					startedAt: null,
					finishedAt: null,
					revertedAt: null,
					createdAt: '2026-01-01T00:00:00.000Z',
					updatedAt: '2026-01-01T00:00:00.000Z'
				}
			]
		});

		expect(getJobsForDevice([job], 'device-1')).toEqual([job]);
		expect(getJobsForDevice([job], 'device-2')).toEqual([]);
		expect(getCurrentStep(job)?.name).toBe('Backup');
	});
});
