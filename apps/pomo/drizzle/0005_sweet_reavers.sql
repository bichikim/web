CREATE TABLE "weather_collection_state" (
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"last_attempted_at" timestamp with time zone NOT NULL,
	"last_failed_at" timestamp with time zone,
	"location" varchar(64) PRIMARY KEY NOT NULL,
	"retry_after" timestamp with time zone,
	CONSTRAINT "weather_collection_state_failures_nonnegative" CHECK ("weather_collection_state"."consecutive_failures" >= 0)
);
