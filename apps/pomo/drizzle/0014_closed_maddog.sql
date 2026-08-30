CREATE TABLE "weather_locations" (
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
CREATE TABLE "weather_provider_usage" (
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
CREATE UNIQUE INDEX "weather_locations_provider_id_index" ON "weather_locations" USING btree ("provider_location_id");