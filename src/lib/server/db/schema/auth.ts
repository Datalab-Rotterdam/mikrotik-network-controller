import { relations, sql } from 'drizzle-orm';
import {
	boolean,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { createdAt, updatedAt } from './common';

export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: varchar('email', { length: 320 }).notNull(),
		displayName: varchar('display_name', { length: 160 }).notNull(),
		passwordHash: text('password_hash').notNull(),
		mfaEnabled: boolean('mfa_enabled').notNull().default(false),
		mfaTotpSecretEncrypted: text('mfa_totp_secret_encrypted'),
		mfaRecoveryCodesEncrypted: jsonb('mfa_recovery_codes_encrypted').$type<string[]>(),
		disabledAt: timestamp('disabled_at', { withTimezone: true }),
		lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('users_email_unique').on(table.email)]
);

export const roles = pgTable(
	'roles',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 80 }).notNull(),
		description: text('description'),
		isSystem: boolean('is_system').notNull().default(false),
		permissions: jsonb('permissions')
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('roles_name_unique').on(table.name)]
);

export const userRoles = pgTable(
	'user_roles',
	{
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		createdAt
	},
	(table) => [primaryKey({ columns: [table.userId, table.roleId] })]
);

export const userSessions = pgTable(
	'user_sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		tokenHash: varchar('token_hash', { length: 64 }).notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		createdAt,
		updatedAt
	},
	(table) => [uniqueIndex('user_sessions_token_hash_unique').on(table.tokenHash)]
);

export const usersRelations = relations(users, ({ many }) => ({
	userRoles: many(userRoles),
	sessions: many(userSessions)
}));

export const rolesRelations = relations(roles, ({ many }) => ({
	userRoles: many(userRoles)
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	})
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
	user: one(users, {
		fields: [userSessions.userId],
		references: [users.id]
	})
}));
