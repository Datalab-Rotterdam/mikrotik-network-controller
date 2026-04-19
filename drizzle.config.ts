import { defineConfig } from 'drizzle-kit';

const databaseUrl =
	process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/mikrotik_network_controller';

export default defineConfig({
	schema: './src/lib/server/db/schema/index.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: databaseUrl
	},
	verbose: true,
	strict: true
});
