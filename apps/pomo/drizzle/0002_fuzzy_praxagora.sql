CREATE TYPE "public"."historical_generation_status" AS ENUM('preparing', 'submitted', 'completed', 'failed', 'rejected');--> statement-breakpoint
CREATE TABLE "historical_generation_runs" (
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"channel_id" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_message" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"open_ai_response_id" varchar(128),
	"prompt_version" varchar(64) NOT NULL,
	"source_policy_version" varchar(64) NOT NULL,
	"source_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "historical_generation_status" DEFAULT 'preparing' NOT NULL,
	"target_date" date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "historical_generation_runs_attempt_count_check" CHECK ("historical_generation_runs"."attempt_count" between 1 and 2)
);
--> statement-breakpoint
CREATE TABLE "processed_openai_webhook_events" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_id" varchar(128) PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historical_generation_runs" ADD CONSTRAINT "historical_generation_runs_channel_id_feed_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."feed_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "historical_generation_runs_channel_target_date_index" ON "historical_generation_runs" USING btree ("channel_id","target_date");--> statement-breakpoint
CREATE UNIQUE INDEX "historical_generation_runs_openai_response_id_index" ON "historical_generation_runs" USING btree ("open_ai_response_id");--> statement-breakpoint
CREATE INDEX "historical_generation_runs_recovery_index" ON "historical_generation_runs" USING btree ("status","updated_at");