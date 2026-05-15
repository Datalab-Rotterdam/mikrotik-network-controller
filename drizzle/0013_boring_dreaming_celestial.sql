ALTER TABLE "device_interfaces" ADD COLUMN "pvid" integer;--> statement-breakpoint
ALTER TABLE "device_interfaces" ADD COLUMN "frame_types" varchar(80);--> statement-breakpoint
ALTER TABLE "device_interfaces" ADD COLUMN "bridge" varchar(160);