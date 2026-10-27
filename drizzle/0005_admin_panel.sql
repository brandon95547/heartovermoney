CREATE TYPE "public"."edition_status" AS ENUM('active', 'void', 'damaged');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'refunded';--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_content" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "artworks" ADD COLUMN "releases_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "status" "edition_status" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "editions" ADD COLUMN "status_note" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_number" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_at" ON "audit_log" USING btree ("at");