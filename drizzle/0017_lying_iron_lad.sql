CREATE TABLE "device_install_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(64) NOT NULL,
	"site_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "agent_token" varchar(64);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "agent_cfgversion" varchar(64);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "agent_last_checkin_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "agent_ip" varchar(64);--> statement-breakpoint
ALTER TABLE "device_install_tokens" ADD CONSTRAINT "device_install_tokens_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_install_tokens" ADD CONSTRAINT "device_install_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_install_tokens" ADD CONSTRAINT "device_install_tokens_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_install_tokens_token_unique" ON "device_install_tokens" USING btree ("token");