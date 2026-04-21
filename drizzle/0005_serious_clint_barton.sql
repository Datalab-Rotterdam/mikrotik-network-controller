CREATE TYPE "public"."job_step_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'reverting', 'reverted', 'revert_failed', 'revert_skipped');--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'rolling_back';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'reverted';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'revert_failed';--> statement-breakpoint
ALTER TYPE "public"."job_status" ADD VALUE 'needs_attention';--> statement-breakpoint
CREATE TABLE "job_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"index" integer NOT NULL,
	"name" varchar(160) NOT NULL,
	"status" "job_step_status" DEFAULT 'queued' NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"revert_result" jsonb,
	"revert_error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"reverted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "site_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "progress" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "max_attempts" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "scheduled_for" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "locked_by" varchar(120);--> statement-breakpoint
ALTER TABLE "job_steps" ADD CONSTRAINT "job_steps_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "job_steps_job_index_unique" ON "job_steps" USING btree ("job_id","index");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;