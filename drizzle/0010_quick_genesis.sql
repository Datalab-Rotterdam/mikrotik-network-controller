CREATE TYPE "public"."firmware_channel" AS ENUM('stable', 'testing', 'long-term');--> statement-breakpoint
CREATE TABLE "firmware_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"current_version" varchar(80),
	"latest_version" varchar(80),
	"channel" "firmware_channel" DEFAULT 'stable' NOT NULL,
	"update_available" boolean DEFAULT false NOT NULL,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "firmware_versions_device_id_unique" UNIQUE("device_id")
);
--> statement-breakpoint
ALTER TABLE "firmware_versions" ADD CONSTRAINT "firmware_versions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;