import { count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { roles, userRoles, users } from '$lib/server/db/schema';

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type RoleRecord = typeof roles.$inferSelect;

export async function countUsers(): Promise<number> {
	const [result] = await db.select({ value: count() }).from(users);

	return result?.value ?? 0;
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
	const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

	return user;
}

export async function findUserById(id: string): Promise<UserRecord | undefined> {
	const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

	return user;
}

export async function createUser(user: NewUserRecord): Promise<UserRecord> {
	const [createdUser] = await db
		.insert(users)
		.values({
			...user,
			email: user.email.toLowerCase()
		})
		.returning();

	return createdUser;
}

export async function findRoleByName(name: string): Promise<RoleRecord | undefined> {
	const [role] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);

	return role;
}

export async function createRole(role: typeof roles.$inferInsert): Promise<RoleRecord> {
	const [createdRole] = await db.insert(roles).values(role).returning();

	return createdRole;
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
	await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
}

export async function getUserRoleNames(userId: string): Promise<string[]> {
	const rows = await db
		.select({ name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(eq(userRoles.userId, userId));

	return rows.map((row) => row.name);
}
