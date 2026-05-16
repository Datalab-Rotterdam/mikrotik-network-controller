CREATE TYPE "public"."vpn_protocol" AS ENUM('wireguard');--> statement-breakpoint
CREATE TYPE "public"."vpn_tunnel_status" AS ENUM('provisioning', 'active', 'error', 'removing');--> statement-breakpoint
CREATE TABLE "vpn_tunnels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"protocol" "vpn_protocol" DEFAULT 'wireguard' NOT NULL,
	"status" "vpn_tunnel_status" DEFAULT 'provisioning' NOT NULL,
	"local_device_id" uuid NOT NULL,
	"remote_device_id" uuid NOT NULL,
	"local_site_id" uuid,
	"remote_site_id" uuid,
	"local_interface_name" varchar(160),
	"remote_interface_name" varchar(160),
	"local_tunnel_address" varchar(64),
	"remote_tunnel_address" varchar(64),
	"local_network_range" varchar(64),
	"remote_network_range" varchar(64),
	"local_public_key" varchar(512),
	"remote_public_key" varchar(512),
	"listen_port" integer DEFAULT 13231 NOT NULL,
	"last_status_at" timestamp,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wg_interfaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"site_id" uuid,
	"router_id" varchar(64) NOT NULL,
	"name" varchar(160) NOT NULL,
	"public_key" varchar(512),
	"listen_port" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wg_peers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"site_id" uuid,
	"router_id" varchar(64) NOT NULL,
	"interface_name" varchar(160),
	"public_key" varchar(512),
	"endpoint_address" varchar(255),
	"endpoint_port" integer,
	"allowed_addresses" varchar(512),
	"last_handshake" varchar(64),
	"rx_bytes" bigint,
	"tx_bytes" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vpn_tunnels" ADD CONSTRAINT "vpn_tunnels_local_device_id_devices_id_fk" FOREIGN KEY ("local_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vpn_tunnels" ADD CONSTRAINT "vpn_tunnels_remote_device_id_devices_id_fk" FOREIGN KEY ("remote_device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vpn_tunnels" ADD CONSTRAINT "vpn_tunnels_local_site_id_sites_id_fk" FOREIGN KEY ("local_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vpn_tunnels" ADD CONSTRAINT "vpn_tunnels_remote_site_id_sites_id_fk" FOREIGN KEY ("remote_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wg_interfaces" ADD CONSTRAINT "wg_interfaces_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wg_interfaces" ADD CONSTRAINT "wg_interfaces_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wg_peers" ADD CONSTRAINT "wg_peers_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wg_peers" ADD CONSTRAINT "wg_peers_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wg_interfaces_device_router_idx" ON "wg_interfaces" USING btree ("device_id","router_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wg_peers_device_router_idx" ON "wg_peers" USING btree ("device_id","router_id");