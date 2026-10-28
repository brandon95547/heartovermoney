ALTER TABLE "users" ADD COLUMN "listed_as_attendee" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_on_scoreboard" boolean DEFAULT true NOT NULL;