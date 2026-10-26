CREATE TYPE "public"."joker_choice" AS ENUM('kept', 'gift_card');--> statement-breakpoint
CREATE TABLE "registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"joker_choice" "joker_choice",
	"fulfillment" "fulfillment" DEFAULT 'pickup' NOT NULL,
	"ship_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registrations_card_id_unique" UNIQUE("card_id")
);
--> statement-breakpoint
ALTER TABLE "cards" DROP CONSTRAINT "cards_claimed_by_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "registrations_event_user" ON "registrations" USING btree ("event_id","user_id");--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "deck";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "special";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "claimed_by_id";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "favorite_design";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "fulfillment";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "ship_address";--> statement-breakpoint
ALTER TABLE "cards" DROP COLUMN "claimed_at";