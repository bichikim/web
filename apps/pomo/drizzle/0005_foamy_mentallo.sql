CREATE TYPE "public"."music_album_locale" AS ENUM('ko', 'en', 'ja', 'zh-Hans');--> statement-breakpoint
CREATE TABLE "music_album_translations" (
	"album_id" uuid NOT NULL,
	"description" text NOT NULL,
	"locale" "music_album_locale" NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_album_translations_album_id_locale_pk" PRIMARY KEY("album_id","locale")
);
--> statement-breakpoint
ALTER TABLE "music_album_translations" ADD CONSTRAINT "music_album_translations_album_id_music_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."music_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "music_album_translations_locale_album_id_index" ON "music_album_translations" USING btree ("locale","album_id");--> statement-breakpoint
INSERT INTO "music_album_translations" ("album_id", "description", "locale", "title")
SELECT "id", "description", 'ko', "title"
FROM "music_albums";--> statement-breakpoint
ALTER TABLE "music_albums" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "music_albums" DROP COLUMN "title";
