import {
	bigint,
	boolean,
	doublePrecision,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar
} from 'drizzle-orm/pg-core';
import { devices } from './devices';

export const deviceMetrics = pgTable(
	'device_metrics',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
		cpuPercent: doublePrecision('cpu_percent'),
		freeMemoryBytes: bigint('free_memory_bytes', { mode: 'number' }),
		totalMemoryBytes: bigint('total_memory_bytes', { mode: 'number' }),
		temperatureCelsius: doublePrecision('temperature_celsius'),
		uptimeSeconds: bigint('uptime_seconds', { mode: 'number' })
	},
	(table) => [index('device_metrics_device_collected_idx').on(table.deviceId, table.collectedAt)]
);

export const interfaceMetrics = pgTable(
	'interface_metrics',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		deviceId: uuid('device_id')
			.notNull()
			.references(() => devices.id, { onDelete: 'cascade' }),
		interfaceName: varchar('interface_name', { length: 160 }).notNull(),
		collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
		rxBytes: bigint('rx_bytes', { mode: 'number' }),
		txBytes: bigint('tx_bytes', { mode: 'number' }),
		rxErrors: bigint('rx_errors', { mode: 'number' }),
		txErrors: bigint('tx_errors', { mode: 'number' }),
		rxDrops: bigint('rx_drops', { mode: 'number' }),
		txDrops: bigint('tx_drops', { mode: 'number' }),
		running: boolean('running').notNull().default(false)
	},
	(table) => [
		index('interface_metrics_device_collected_idx').on(table.deviceId, table.collectedAt)
	]
);
