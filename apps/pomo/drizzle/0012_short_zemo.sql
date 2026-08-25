CREATE TABLE IF NOT EXISTS "music_track_registrations" (
	"album_id" uuid NOT NULL CONSTRAINT "music_track_registrations_album_id_music_albums_id_fk" REFERENCES "public"."music_albums"("id") ON DELETE cascade ON UPDATE no action,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"track_id" uuid PRIMARY KEY NOT NULL CONSTRAINT "music_track_registrations_track_id_music_tracks_id_fk" REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_track_registrations_created_at_index" ON "music_track_registrations" USING btree ("created_at");
