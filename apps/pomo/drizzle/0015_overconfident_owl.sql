CREATE TYPE "public"."historical_generation_submission_state" AS ENUM('unknown', 'expired');--> statement-breakpoint
ALTER TABLE "historical_generation_runs" ADD COLUMN "submission_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "historical_generation_runs" ADD COLUMN "submission_state" "historical_generation_submission_state";--> statement-breakpoint
CREATE INDEX "historical_generation_runs_submission_recovery_index" ON "historical_generation_runs" USING btree ("status","submission_state","submission_expires_at");
