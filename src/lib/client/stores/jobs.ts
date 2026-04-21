import { derived, writable } from 'svelte/store';
import type { ActionEvent, ActionJob, JobStepStatus } from '$lib/shared/action-events';

type JobsState = {
	jobs: ActionJob[];
};

const terminalStatuses = new Set<ActionJob['status']>([
	'succeeded',
	'failed',
	'cancelled',
	'reverted',
	'revert_failed',
	'needs_attention'
]);

const initialState: JobsState = {
	jobs: []
};

export const jobsState = writable<JobsState>(initialState);

function sortJobs(jobs: ActionJob[]): ActionJob[] {
	return [...jobs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function mergeJob(jobs: ActionJob[], job: ActionJob): ActionJob[] {
	const next = jobs.filter((item) => item.id !== job.id);
	return sortJobs([job, ...next]);
}

export function setJobsSnapshot(jobs: ActionJob[]): void {
	jobsState.set({ jobs: sortJobs(jobs) });
}

export function upsertJob(job: ActionJob): void {
	jobsState.update((state) => ({
		jobs: mergeJob(state.jobs, job)
	}));
}

export function processJobActionEvent(event: ActionEvent): void {
	if (event.type === 'job.snapshot') {
		setJobsSnapshot(event.payload.jobs);
		return;
	}

	if (event.type === 'job.updated') {
		upsertJob(event.payload.job);
	}
}

export const runningJobs = derived(jobsState, ($jobsState) =>
	$jobsState.jobs.filter((job) => !terminalStatuses.has(job.status))
);

export function getJobsForDevice(jobs: ActionJob[], deviceId: string): ActionJob[] {
	return jobs.filter((job) => job.deviceId === deviceId);
}

export function getCurrentStep(job: ActionJob) {
	return (
		job.steps.find((step) => step.status === 'running' || step.status === 'reverting') ??
		job.steps.find((step) => step.status === 'queued') ??
		job.steps.at(-1) ??
		null
	);
}

export function isRunningJob(job: ActionJob): boolean {
	return !terminalStatuses.has(job.status);
}

export function formatJobStatus(status: ActionJob['status'] | JobStepStatus): string {
	return status
		.split('_')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}
