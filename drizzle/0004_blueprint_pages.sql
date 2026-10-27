CREATE TYPE "public"."film_kind" AS ENUM('music_video', 'city_film', 'mission_story', 'behind_the_scenes');--> statement-breakpoint
CREATE TYPE "public"."provenance_kind" AS ENUM('issued', 'transferred');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "films" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"kind" "film_kind" NOT NULL,
	"city_id" uuid,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"poster" text NOT NULL,
	"video_url" text,
	"minutes" integer,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "films_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "joker_timers" (
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"choice" "joker_choice",
	"chosen_at" timestamp with time zone,
	CONSTRAINT "joker_timers_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edition_id" uuid NOT NULL,
	"kind" "provenance_kind" NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "terms" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "lots" ADD COLUMN "is_art" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "checked_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ship_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_updates" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "films" ADD CONSTRAINT "films_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joker_timers" ADD CONSTRAINT "joker_timers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "joker_timers" ADD CONSTRAINT "joker_timers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance" ADD CONSTRAINT "provenance_edition_id_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance" ADD CONSTRAINT "provenance_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance" ADD CONSTRAINT "provenance_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provenance_edition" ON "provenance" USING btree ("edition_id");--> statement-breakpoint
-- Pieces sold before the ownership record existed: issued to their owner on the day they were sold.
INSERT INTO "provenance" ("edition_id", "kind", "to_user_id", "at") SELECT "id", 'issued', "owner_id", "issued_at" FROM "editions";
