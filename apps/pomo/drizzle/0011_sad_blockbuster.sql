CREATE TABLE "music_track_registrations" (
	"album_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"track_id" uuid PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_track_registrations" ADD CONSTRAINT "music_track_registrations_album_id_music_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."music_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_track_registrations" ADD CONSTRAINT "music_track_registrations_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_track_registrations_created_at_index" ON "music_track_registrations" USING btree ("created_at");