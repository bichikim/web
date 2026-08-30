DO $$ BEGIN
	CREATE TYPE "public"."music_album_cover_reservation_status" AS ENUM('uploading', 'pending', 'deleting');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "music_album_cover_reservations" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "music_album_cover_reservations_object_key_index" ON "music_album_cover_reservations" USING btree ("object_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "music_album_cover_reservations_cleanup_index" ON "music_album_cover_reservations" USING btree ("status","expires_at","created_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_locations" (
	"country" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"name" varchar(128) NOT NULL,
	"provider_location_id" varchar(64) NOT NULL,
	"region" varchar(128) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_locations_latitude_range" CHECK ("weather_locations"."latitude" between -90 and 90),
	CONSTRAINT "weather_locations_longitude_range" CHECK ("weather_locations"."longitude" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weather_provider_usage" (
	"billing_month" varchar(7) PRIMARY KEY NOT NULL,
	"current_requests" integer DEFAULT 0 NOT NULL,
	"rate_requests" integer DEFAULT 0 NOT NULL,
	"rate_window_minute" varchar(16) NOT NULL,
	"search_requests" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weather_provider_usage_month_format" CHECK ("weather_provider_usage"."billing_month" ~ '^[0-9]{4}-[0-9]{2}$'),
	CONSTRAINT "weather_provider_usage_requests_nonnegative" CHECK ("weather_provider_usage"."current_requests" >= 0 and "weather_provider_usage"."rate_requests" >= 0 and "weather_provider_usage"."search_requests" >= 0),
	CONSTRAINT "weather_provider_usage_rate_window_format" CHECK ("weather_provider_usage"."rate_window_minute" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "weather_locations_provider_id_index" ON "weather_locations" USING btree ("provider_location_id");
