CREATE TYPE "public"."historical_era" AS ENUM('bce', 'ce');--> statement-breakpoint
CREATE TYPE "public"."historical_moment_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "feed_channels" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"language" varchar(16) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feed_channels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "historical_moment_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moment_id" uuid NOT NULL,
	"publisher" text,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	CONSTRAINT "historical_moment_sources_sort_order_check" CHECK ("historical_moment_sources"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "historical_moments" (
	"channel_id" uuid NOT NULL,
	"content_html" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_day" smallint NOT NULL,
	"event_month" smallint NOT NULL,
	"event_year" integer NOT NULL,
	"generation_model" varchar(128),
	"historical_era" "historical_era" DEFAULT 'ce' NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"stable_key" varchar(128) NOT NULL,
	"status" "historical_moment_status" DEFAULT 'draft' NOT NULL,
	"summary" text NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_moments_event_year_check" CHECK ("historical_moments"."event_year" > 0),
	CONSTRAINT "historical_moments_event_month_check" CHECK ("historical_moments"."event_month" between 1 and 12),
	CONSTRAINT "historical_moments_event_day_check" CHECK ("historical_moments"."event_day" between 1 and 31)
);
--> statement-breakpoint
ALTER TABLE "historical_moment_sources" ADD CONSTRAINT "historical_moment_sources_moment_id_historical_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."historical_moments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historical_moments" ADD CONSTRAINT "historical_moments_channel_id_feed_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."feed_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "historical_moment_sources_moment_url_index" ON "historical_moment_sources" USING btree ("moment_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "historical_moments_channel_stable_key_index" ON "historical_moments" USING btree ("channel_id","stable_key");--> statement-breakpoint
CREATE INDEX "historical_moments_feed_date_index" ON "historical_moments" USING btree ("channel_id","event_month","event_day","status");