CREATE TABLE "device_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"site_id" uuid,
	"mac_address" varchar(32) NOT NULL,
	"ip_address" varchar(64),
	"hostname" varchar(255),
	"interface_name" varchar(160),
	"is_wireless" boolean DEFAULT false NOT NULL,
	"ssid" varchar(255),
	"signal_strength" integer,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cpu_percent" double precision,
	"free_memory_bytes" bigint,
	"total_memory_bytes" bigint,
	"temperature_celsius" double precision,
	"uptime_seconds" bigint
);
--> statement-breakpoint
CREATE TABLE "interface_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"interface_name" varchar(160) NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rx_bytes" bigint,
	"tx_bytes" bigint,
	"rx_errors" bigint,
	"tx_errors" bigint,
	"rx_drops" bigint,
	"tx_drops" bigint,
	"running" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "device_clients" ADD CONSTRAINT "device_clients_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_clients" ADD CONSTRAINT "device_clients_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_metrics" ADD CONSTRAINT "device_metrics_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interface_metrics" ADD CONSTRAINT "interface_metrics_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_clients_device_mac_unique" ON "device_clients" USING btree ("device_id","mac_address");--> statement-breakpoint
CREATE INDEX "device_metrics_device_collected_idx" ON "device_metrics" USING btree ("device_id","collected_at");--> statement-breakpoint
CREATE INDEX "interface_metrics_device_collected_idx" ON "interface_metrics" USING btree ("device_id","collected_at");