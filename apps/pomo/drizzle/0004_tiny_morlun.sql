CREATE TYPE "public"."weather_precipitation" AS ENUM('none', 'rain', 'mixed', 'snow');--> statement-breakpoint
CREATE TYPE "public"."weather_sky" AS ENUM('clear', 'cloudy', 'overcast');--> statement-breakpoint
CREATE TABLE "weather" (
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"humidity_percent" real,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location" varchar(64) NOT NULL,
	"precipitation" "weather_precipitation" NOT NULL,
	"precipitation_millimeters" real,
	"sky" "weather_sky",
	"temperature_celsius" real,
	"weather_at" timestamp with time zone NOT NULL,
	"wind_speed_meters_per_second" real
);
--> statement-breakpoint
CREATE UNIQUE INDEX "weather_location_time_index" ON "weather" USING btree ("location","weather_at");