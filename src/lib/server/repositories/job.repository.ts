import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { devices, jobSteps, jobs } from '$lib/server/db/schema';

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

export const JobRepository = {
	async create(input: CreateJobInput) {
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
	},

	async get(id: string) {
		const result = await db.select().from(jobs).where(eq(jobs.id, id));
		return result[0] ?? null;
	},

	async listRecent(limit = 50) {
		return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(limit);
	},

	async listRecentBySite(siteId: string, limit = 50) {
		// Find all device IDs belonging to this site
		const siteDevices = await db
			.select({ id: devices.id })
			.from(devices)
			.where(eq(devices.siteId, siteId));

		const deviceIdList = siteDevices.map((d) => d.id);

		// Match jobs by siteId, OR jobs with null siteId whose deviceId belongs to the site
		const whereClause = deviceIdList.length > 0
			? or(
					eq(jobs.siteId, siteId),
					and(isNull(jobs.siteId), inArray(jobs.deviceId, deviceIdList))
				)
			: eq(jobs.siteId, siteId);

		return db
			.select()
			.from(jobs)
			.where(whereClause)
			.orderBy(desc(jobs.createdAt))
			.limit(limit);
	},

	async listRunning() {
		return db.select().from(jobs).where(eq(jobs.status, 'running'));
	},

	async listRunningBySite(siteId: string) {
		return db
			.select()
			.from(jobs)
			.where(and(eq(jobs.siteId, siteId), eq(jobs.status, 'running')))
			.orderBy(desc(jobs.createdAt));
	},

	async listByDevice(deviceId: string, limit = 20) {
		return db
			.select()
			.from(jobs)
			.where(eq(jobs.deviceId, deviceId))
			.orderBy(desc(jobs.createdAt))
			.limit(limit);
	},

	async getWithSteps(id: string) {
		const job = await JobRepository.get(id);

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
	},

	async update(
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
	},

	async markRunning(id: string) {
		return JobRepository.update(id, {
			status: 'running',
			startedAt: new Date(),
			lockedAt: new Date(),
			lockedBy: process.pid.toString(),
			attemptCount: 1
		});
	},

	async markFinished(
		id: string,
		status: Extract<JobStatus, 'succeeded' | 'failed' | 'cancelled' | 'reverted' | 'revert_failed' | 'needs_attention'>,
		patch: {
			progress?: number;
			result?: Record<string, unknown>;
			errorMessage?: string | null;
		} = {}
	) {
		const update: Parameters<typeof JobRepository.update>[1] = {
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

		return JobRepository.update(id, {
			...update
		});
	},

	async markRollingBack(id: string, errorMessage: string) {
		return JobRepository.update(id, {
			status: 'rolling_back',
			errorMessage
		});
	}
};
