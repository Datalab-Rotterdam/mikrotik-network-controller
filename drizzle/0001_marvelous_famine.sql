CREATE TYPE "public"."adoption_attempt_status" AS ENUM('pending', 'validating_credentials', 'syncing_inventory', 'creating_backup', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "adoption_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"device_id" uuid,
	"requested_by_user_id" uuid,
	"status" "adoption_attempt_status" DEFAULT 'pending' NOT NULL,
	"mode" "adoption_mode" DEFAULT 'read_only' NOT NULL,
	"host" varchar(255) NOT NULL,
	"username" varchar(160) NOT NULL,
	"error_message" text,
	"progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "adoption_attempts" ADD CONSTRAINT "adoption_attempts_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_attempts" ADD CONSTRAINT "adoption_attempts_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adoption_attempts" ADD CONSTRAINT "adoption_attempts_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;