CREATE TYPE "public"."music_album_cover_reservation_status" AS ENUM('uploading', 'pending', 'deleting');--> statement-breakpoint
CREATE TABLE "music_album_cover_reservations" (
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"draft_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"object_key" text NOT NULL,
	"status" "music_album_cover_reservation_status" DEFAULT 'uploading' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_album_cover_reservations_object_key_check" CHECK ("music_album_cover_reservations"."object_key"
        = 'album-covers/' || "music_album_cover_reservations"."id"::text || '/cover.webp'),
	CONSTRAINT "music_album_cover_reservations_url_check" CHECK (("music_album_cover_reservations"."status" = 'uploading' and "music_album_cover_reservations"."cover_image_url" is null)
        or "music_album_cover_reservations"."status" = 'deleting'
        or ("music_album_cover_reservations"."status" = 'pending'
          and "music_album_cover_reservations"."cover_image_url" is not null
          and "music_album_cover_reservations"."cover_image_url" like 'https://%'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "music_album_cover_reservations_object_key_index" ON "music_album_cover_reservations" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "music_album_cover_reservations_cleanup_index" ON "music_album_cover_reservations" USING btree ("status","expires_at","created_at");