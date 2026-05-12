import { count, desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/client';
import { roles, userRoles, users } from '$lib/server/db/schema';

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
export type RoleRecord = typeof roles.$inferSelect;

export const UserRepository = {
	async count(): Promise<number> {
		const [result] = await db.select({ value: count() }).from(users);

		return result?.value ?? 0;
	},

	async findByEmail(email: string): Promise<UserRecord | undefined> {
		const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

		return user;
	},

	async findById(id: string): Promise<UserRecord | undefined> {
		const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

		return user;
	},

	async create(user: NewUserRecord): Promise<UserRecord> {
		const [createdUser] = await db
			.insert(users)
			.values({
				...user,
				email: user.email.toLowerCase()
			})
			.returning();

		return createdUser;
	},

	async findRoleByName(name: string): Promise<RoleRecord | undefined> {
		const [role] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);

		return role;
	},

	async createRole(role: typeof roles.$inferInsert): Promise<RoleRecord> {
		const [createdRole] = await db.insert(roles).values(role).returning();

		return createdRole;
	},

	async assignRole(userId: string, roleId: string): Promise<void> {
		await db.insert(userRoles).values({ userId, roleId }).onConflictDoNothing();
	},

	async getRoleNames(userId: string): Promise<string[]> {
		const rows = await db
			.select({ name: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.where(eq(userRoles.userId, userId));

		return rows.map((row) => row.name);
	},

	async list() {
		return db.select().from(users).orderBy(users.createdAt);
	},

	async listRoles() {
		return db.select().from(roles).orderBy(roles.name);
	},

	async update(
		id: string,
		patch: Partial<Pick<NewUserRecord, 'displayName' | 'email' | 'passwordHash' | 'disabledAt'>>
	) {
		const [row] = await db
			.update(users)
			.set({ ...patch, updatedAt: new Date() })
			.where(eq(users.id, id))
			.returning();
		return row ?? null;
	},

	async delete(id: string) {
		await db.delete(users).where(eq(users.id, id));
	},

	async updateRole(
		id: string,
		patch: Partial<Pick<typeof roles.$inferInsert, 'name' | 'description' | 'permissions'>>
	) {
		const [row] = await db
			.update(roles)
			.set({ ...patch, updatedAt: new Date() })
			.where(eq(roles.id, id))
			.returning();
		return row ?? null;
	},

	async deleteRole(id: string) {
		await db.delete(roles).where(eq(roles.id, id));
	},

	async getRoles(userId: string) {
		return db
			.select({ roleId: userRoles.roleId, roleName: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.where(eq(userRoles.userId, userId));
	},

	async setRoles(userId: string, roleIds: string[]) {
		await db.delete(userRoles).where(eq(userRoles.userId, userId));
		if (roleIds.length > 0) {
			await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId, roleId }))).onConflictDoNothing();
		}
	},

	async listWithRoles() {
		const allUsers = await UserRepository.list();
		const allRoleRows = await db
			.select({ userId: userRoles.userId, roleName: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id));

		const rolesByUser = new Map<string, string[]>();
		for (const row of allRoleRows) {
			const arr = rolesByUser.get(row.userId) ?? [];
			arr.push(row.roleName);
			rolesByUser.set(row.userId, arr);
		}

		return allUsers.map((u) => ({ ...u, roleNames: rolesByUser.get(u.id) ?? [] }));
	}
};
