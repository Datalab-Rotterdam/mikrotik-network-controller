<script lang="ts">
	import { onMount } from 'svelte';
	import SidePanel from '$lib/client/components/SidePanel.svelte';
	import {
		formatJobStatus,
		getCurrentStep,
		isRunningJob,
		jobsState,
		setJobsSnapshot
	} from '$lib/client/stores/jobs';
	import type { JobStatus } from '$lib/shared/action-events';

	let { data } = $props();

	const basePath = $derived(`/manage/${data.site.id}`);
	const jobs = $derived($jobsState.jobs.filter((job) => job.siteId === data.site.id));
	const runningJobs = $derived(jobs.filter((job) => isRunningJob(job)));
	const selectedJob = $derived(jobs.find((job) => job.id === data.selectedJobId));

	onMount(() => {
		setJobsSnapshot(data.jobs);
	});

	function formatDate(value: string | null | undefined) {
		if (!value) {
			return '-';
		}

		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function stepScript(step: { result: Record<string, unknown> }) {
		return typeof step.result.script === 'string' ? step.result.script : '';
	}

	function getJobStatusTone(status: JobStatus) {
		switch (status) {
			case 'succeeded':
				return 'success';
			case 'failed':
			case 'revert_failed':
				return 'danger';
			case 'rolling_back':
			case 'needs_attention':
				return 'warning';
			case 'running':
				return 'running';
			case 'cancelled':
			case 'reverted':
				return 'muted';
			case 'queued':
			default:
				return 'queued';
		}
	}
</script>

<section class="jobs-page" class:with-panel={Boolean(selectedJob)}>
	<div class="jobs-toolbar">
		<div>
			<h1>Jobs</h1>
			<p>{runningJobs.length} running, {jobs.length} recent</p>
		</div>
	</div>

	<div class="jobs-table-wrap">
		<table class="jobs-table">
			<thead>
				<tr>
					<th>Task</th>
					<th>Status</th>
					<th>Progress</th>
					<th>Current step</th>
					<th>Started</th>
					<th>Finished</th>
				</tr>
			</thead>
			<tbody>
				{#if jobs.length}
					{#each jobs as job}
						{@const currentStep = getCurrentStep(job)}
						<tr>
							<td>
								<a class="job-link" href={`${basePath}/jobs?job=${job.id}`}>{job.type}</a>
								<span>{job.deviceId ?? 'Site task'}</span>
							</td>
							<td>
								<span class={`status-pill status-${getJobStatusTone(job.status)}`}>{formatJobStatus(job.status)}</span>
							</td>
							<td>
								<div class="progress-cell">
									<div class="progress-bar" aria-label={`${job.progress}% complete`}>
										<span style={`width: ${job.progress}%`}></span>
									</div>
									<strong>{job.progress}%</strong>
								</div>
							</td>
							<td>{currentStep?.name ?? '-'}</td>
							<td>{formatDate(job.startedAt ?? job.createdAt)}</td>
							<td>{formatDate(job.finishedAt)}</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td colspan="6">
							<div class="jobs-empty">No jobs have run for this site yet.</div>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	{#if selectedJob}
		<SidePanel open title={selectedJob.type} closeHref={`${basePath}/jobs`}>
			<div class="job-detail">
				<div class="detail-summary">
					<div>
						<span>Status</span>
						<strong class={`status-value status-${getJobStatusTone(selectedJob.status)}`}>{formatJobStatus(selectedJob.status)}</strong>
					</div>
					<div>
						<span>Progress</span>
						<strong>{selectedJob.progress}%</strong>
					</div>
					<div>
						<span>Started</span>
						<strong>{formatDate(selectedJob.startedAt ?? selectedJob.createdAt)}</strong>
					</div>
					<div>
						<span>Finished</span>
						<strong>{formatDate(selectedJob.finishedAt)}</strong>
					</div>
				</div>

				{#if selectedJob.errorMessage}
					<div class="job-error">{selectedJob.errorMessage}</div>
				{/if}

				<div class="steps-card">
					<div class="card-heading">
						<strong>Steps</strong>
						<span>{selectedJob.steps.length}</span>
					</div>
					{#each selectedJob.steps as step}
						<div class="step-row">
							<div class="step-status" class:active={step.status === 'running' || step.status === 'reverting'}></div>
							<div>
								<strong>{step.name}</strong>
								<span>{formatJobStatus(step.status)}</span>
								{#if step.errorMessage}
									<p>{step.errorMessage}</p>
								{/if}
								{#if step.revertErrorMessage}
									<p>{step.revertErrorMessage}</p>
								{/if}
								{#if stepScript(step)}
									<pre class="script-result">{stepScript(step)}</pre>
								{/if}
							</div>
							<time>{formatDate(step.finishedAt ?? step.revertedAt ?? step.startedAt)}</time>
						</div>
					{/each}
				</div>
			</div>
		</SidePanel>
	{/if}
</section>

<style lang="scss">
	.jobs-page {
		display: grid;
		gap: 12px;
	}

	.jobs-page.with-panel {
		padding-right: min(390px, 28vw);
	}

	.jobs-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		min-height: 50px;
		margin: -18px -14px 6px;
		padding: 0 18px;
		border-bottom: 1px solid #eef1f3;
		background: var(--color-surface);
	}

	h1 {
		margin: 0;
		color: #6f7780;
		font-size: 20px;
		font-weight: 500;
	}

	p {
		margin: 3px 0 0;
		color: var(--color-muted);
		font-size: 13px;
	}

	.jobs-table-wrap {
		border-top: 1px solid #eef1f3;
		background: var(--color-surface);
		overflow-x: auto;
	}

	.jobs-table {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	.jobs-table th,
	.jobs-table td {
		height: 48px;
		padding: 0 14px;
		border-bottom: 1px solid #f0f2f4;
		color: #323a40;
		font-size: 13px;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.jobs-table th {
		color: #2f3438;
		font-weight: 800;
	}

	.job-link {
		display: block;
		color: var(--color-link);
		font-weight: 700;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.jobs-table td span {
		color: #8a949c;
		font-size: 12px;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		min-height: 24px;
		border: 1px solid #e2e8ec;
		border-radius: 4px;
		padding: 0 8px;
		background: #fbfdff;
	}

	.status-pill.status-running,
	.status-value.status-running {
		border-color: #b9daf8;
		color: var(--color-link);
		background: #eef6ff;
	}

	.status-pill.status-success,
	.status-value.status-success {
		border-color: #b7dfc2;
		color: #237a3b;
		background: #effaf2;
	}

	.status-pill.status-danger,
	.status-value.status-danger {
		border-color: #efb8b8;
		color: var(--color-danger);
		background: #fff2f2;
	}

	.status-pill.status-warning,
	.status-value.status-warning {
		border-color: #e8d391;
		color: #7a5b12;
		background: #fff8df;
	}

	.status-pill.status-muted,
	.status-value.status-muted {
		border-color: #d7dde2;
		color: #606b74;
		background: #f4f6f8;
	}

	.status-pill.status-queued,
	.status-value.status-queued {
		border-color: #dfe7ed;
		color: #5f7180;
		background: #f7fbff;
	}

	.progress-cell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 42px;
		align-items: center;
		gap: 10px;
	}

	.progress-cell strong {
		color: #7c858d;
		font-size: 12px;
		text-align: right;
	}

	.progress-bar {
		height: 6px;
		border-radius: 999px;
		background: #e8edf1;
		overflow: hidden;
	}

	.progress-bar span {
		display: block;
		height: 100%;
		min-width: 3px;
		border-radius: inherit;
		background: var(--color-link);
	}

	.jobs-empty {
		display: grid;
		place-items: center;
		min-height: 260px;
		color: #656c72;
	}

	.job-detail {
		display: grid;
		gap: 16px;
	}

	.detail-summary,
	.steps-card {
		display: grid;
		gap: 14px;
		border-radius: 6px;
		padding: 16px;
		background: #fbfdff;
	}

	.detail-summary div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: #3f484f;
		font-size: 14px;
	}

	.detail-summary span,
	.step-row span,
	.card-heading span {
		color: #8a949c;
		font-size: 12px;
	}

	.detail-summary strong {
		color: #7c858d;
		font-weight: 500;
		text-align: right;
	}

	.detail-summary .status-value {
		border: 1px solid #e2e8ec;
		border-radius: 4px;
		padding: 2px 8px;
	}

	.job-error {
		border: 1px solid #efb8b8;
		border-radius: 6px;
		padding: 10px 12px;
		color: var(--color-danger);
		background: #fff2f2;
	}

	.card-heading {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		color: #30373d;
	}

	.step-row {
		display: grid;
		grid-template-columns: 10px minmax(0, 1fr) auto;
		gap: 10px;
		border-top: 1px solid #eef1f3;
		padding-top: 12px;
	}

	.step-row:first-of-type {
		border-top: 0;
		padding-top: 0;
	}

	.step-row strong,
	.step-row span {
		display: block;
	}

	.step-row p {
		margin-top: 6px;
		color: var(--color-danger);
	}

	.script-result {
		max-height: 320px;
		margin: 10px 0 0;
		overflow: auto;
		border: 1px solid #e1e7ec;
		border-radius: 6px;
		padding: 10px;
		color: #253038;
		background: #ffffff;
		font-size: 12px;
		line-height: 1.45;
		white-space: pre;
	}

	.step-row time {
		color: #8a949c;
		font-size: 12px;
		white-space: nowrap;
	}

	.step-status {
		width: 7px;
		height: 7px;
		margin-top: 4px;
		border-radius: 50%;
		background: #cfd7dd;
	}

	.step-status.active {
		background: var(--color-link);
	}

	@media (max-width: 900px) {
		.jobs-page.with-panel {
			padding-right: 0;
		}

		.jobs-table {
			min-width: 780px;
		}
	}
</style>
