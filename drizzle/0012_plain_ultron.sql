CREATE TYPE "public"."firewall_action" AS ENUM('accept', 'drop', 'reject', 'jump', 'return', 'passthrough', 'log');--> statement-breakpoint
CREATE TYPE "public"."firewall_chain" AS ENUM('input', 'forward', 'output');--> statement-breakpoint
CREATE TABLE "firewall_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"site_id" uuid,
	"chain" "firewall_chain" NOT NULL,
	"action" "firewall_action" NOT NULL,
	"src_address" varchar(255),
	"dst_address" varchar(255),
	"protocol" varchar(32),
	"src_port" varchar(64),
	"dst_port" varchar(64),
	"in_interface" varchar(160),
	"out_interface" varchar(160),
	"comment" varchar(512),
	"disabled" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"router_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vlans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"site_id" uuid,
	"vlan_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"interface_name" varchar(160),
	"comment" varchar(512),
	"router_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "firewall_rules" ADD CONSTRAINT "firewall_rules_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firewall_rules" ADD CONSTRAINT "firewall_rules_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlans" ADD CONSTRAINT "vlans_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vlans" ADD CONSTRAINT "vlans_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "firewall_rules_device_router_idx" ON "firewall_rules" USING btree ("device_id","router_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vlans_device_router_idx" ON "vlans" USING btree ("device_id","router_id");