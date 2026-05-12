import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { jobSteps } from '$lib/server/db/schema';

export interface CreateJobStepInput {
	jobId: string;
	index: number;
	name: string;
}

export const JobStepRepository = {
	async createMany(input: CreateJobStepInput[]) {
		if (input.length === 0) {
			return [];
		}

		return db.insert(jobSteps).values(input).returning();
	},

	async get(id: string) {
		const result = await db.select().from(jobSteps).where(eq(jobSteps.id, id));
		return result[0] ?? null;
	},

	async list(jobId: string) {
		return db
			.select()
			.from(jobSteps)
			.where(eq(jobSteps.jobId, jobId))
			.orderBy(asc(jobSteps.index));
	},

	async update(
		id: string,
		patch: Partial<Omit<typeof jobSteps.$inferInsert, 'id' | 'jobId' | 'index' | 'createdAt'>>
	) {
		const [step] = await db
			.update(jobSteps)
			.set({
				...patch,
				updatedAt: new Date()
			})
			.where(eq(jobSteps.id, id))
			.returning();

		return step ?? null;
	}
};
