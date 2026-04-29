CREATE TYPE "public"."topology_discovery_method" AS ENUM('lldp', 'cdp', 'neighbor');--> statement-breakpoint
CREATE TABLE "topology_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_id" uuid,
	"source_device_id" uuid NOT NULL,
	"source_interface" varchar(160),
	"target_device_id" uuid,
	"target_host" varchar(255),
	"target_interface" varchar(160),
	"target_identity" varchar(160),
	"discovered_via" "topology_discovery_method" DEFAULT 'neighbor' NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topology_links" ADD CONSTRAINT "topology_links_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topology_links" ADD CONSTRAINT "topology_links_source_device_id_devices_id_fk" FOREIGN KEY ("source_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topology_links" ADD CONSTRAINT "topology_links_target_device_id_devices_id_fk" FOREIGN KEY ("target_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topology_links_unique" ON "topology_links" USING btree ("source_device_id","source_interface","target_host");