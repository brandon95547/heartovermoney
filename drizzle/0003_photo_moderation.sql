CREATE TYPE "public"."photo_removal" AS ENUM('admin', 'community');--> statement-breakpoint
CREATE TABLE "photo_downvotes" (
	"photo_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "photo_downvotes_photo_id_user_id_pk" PRIMARY KEY("photo_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "removed_by" "photo_removal";--> statement-breakpoint
ALTER TABLE "photo_downvotes" ADD CONSTRAINT "photo_downvotes_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photo_downvotes" ADD CONSTRAINT "photo_downvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;