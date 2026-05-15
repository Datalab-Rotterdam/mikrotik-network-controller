CREATE TYPE "public"."syslog_severity" AS ENUM('emergency', 'alert', 'critical', 'error', 'warning', 'notice', 'info', 'debug');--> statement-breakpoint
CREATE TABLE "syslog_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid,
	"site_id" uuid NOT NULL,
	"severity" "syslog_severity" DEFAULT 'info' NOT NULL,
	"category" varchar(80) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "syslog_events" ADD CONSTRAINT "syslog_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "syslog_events" ADD CONSTRAINT "syslog_events_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "syslog_events_id_unique" ON "syslog_events" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX "syslog_events_site_created_idx" ON "syslog_events" USING btree ("site_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "syslog_events_device_created_idx" ON "syslog_events" USING btree ("device_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "syslog_events_severity_idx" ON "syslog_events" USING btree ("severity");