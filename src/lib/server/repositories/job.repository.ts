import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { jobSteps, jobs } from '$lib/server/db/schema';

type JobStatus = typeof jobs.$inferSelect.status;

export interface CreateJobInput {
	type: string;
	deviceId?: string | null;
	siteId?: string | null;
	requestedByUserId?: string | null;
	payload?: Record<string, unknown>;
	maxAttempts?: number;
	scheduledFor?: Date | null;
}

export async function createJob(input: CreateJobInput) {
	const [job] = await db
		.insert(jobs)
		.values({
			type: input.type,
			deviceId: input.deviceId ?? null,
			siteId: input.siteId ?? null,
			requestedByUserId: input.requestedByUserId ?? null,
			payload: input.payload ?? {},
			maxAttempts: input.maxAttempts ?? 1,
			scheduledFor: input.scheduledFor ?? null
		})
		.returning();

	return job;
}

export async function getJob(id: string) {
	const result = await db.select().from(jobs).where(eq(jobs.id, id));
	return result[0] ?? null;
}

export async function listRecentJobs(limit = 50) {
	return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
}

export async function listRecentJobsBySite(siteId: string, limit = 50) {
	return db
		.select()
		.from(jobs)
		.where(eq(jobs.siteId, siteId))
		.orderBy(desc(jobs.createdAt))
		.limit(limit);
}

export async function listRunningJobs() {
	return db.select().from(jobs).where(eq(jobs.status, 'running'));
}

export async function listRunningJobsBySite(siteId: string) {
	return db
		.select()
		.from(jobs)
		.where(and(eq(jobs.siteId, siteId), eq(jobs.status, 'running')))
		.orderBy(desc(jobs.createdAt));
}

export async function listJobsByDevice(deviceId: string, limit = 20) {
	return db
		.select()
		.from(jobs)
		.where(eq(jobs.deviceId, deviceId))
		.orderBy(desc(jobs.createdAt))
		.limit(limit);
}

export async function getJobWithSteps(id: string) {
	const job = await getJob(id);

	if (!job) {
		return null;
	}

	const steps = await db
		.select()
		.from(jobSteps)
		.where(eq(jobSteps.jobId, id))
		.orderBy(asc(jobSteps.index));

	return {
		...job,
		steps
	};
}

export async function updateJob(
	id: string,
	patch: Partial<Omit<typeof jobs.$inferInsert, 'id' | 'createdAt'>>
) {
	const [job] = await db
		.update(jobs)
		.set({
			...patch,
			updatedAt: new Date()
		})
		.where(eq(jobs.id, id))
		.returning();

	return job ?? null;
}

export async function markJobRunning(id: string) {
	return updateJob(id, {
		status: 'running',
		startedAt: new Date(),
		lockedAt: new Date(),
		lockedBy: process.pid.toString(),
		attemptCount: 1
	});
}

export async function markJobFinished(
	id: string,
	status: Extract<JobStatus, 'succeeded' | 'failed' | 'cancelled' | 'reverted' | 'revert_failed' | 'needs_attention'>,
	patch: {
		progress?: number;
		result?: Record<string, unknown>;
		errorMessage?: string | null;
	} = {}
) {
	const update: Parameters<typeof updateJob>[1] = {
		status,
		finishedAt: new Date(),
		lockedAt: null,
		lockedBy: null
	};

	if (patch.progress !== undefined || status === 'succeeded') {
		update.progress = patch.progress ?? 100;
	}

	if (patch.result !== undefined) {
		update.result = patch.result;
	}

	if (patch.errorMessage !== undefined) {
		update.errorMessage = patch.errorMessage;
	}

	return updateJob(id, {
		...update
	});
}

export async function markJobRollingBack(id: string, errorMessage: string) {
	return updateJob(id, {
		status: 'rolling_back',
		errorMessage
	});
}
