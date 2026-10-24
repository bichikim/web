CREATE TYPE "public"."ai_artifact_lifecycle" AS ENUM('temporary', 'archiving', 'saved', 'deletion_pending', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."ai_artifact_retention_class" AS ENUM('temporary', 'unsaved_result', 'saved_result');--> statement-breakpoint
CREATE TYPE "public"."ai_concurrency_scope" AS ENUM('user', 'media', 'runner');--> statement-breakpoint
CREATE TYPE "public"."ai_cost_ledger_status" AS ENUM('pending', 'succeeded', 'failed', 'cancelled', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."ai_job_capability" AS ENUM('text', 'speech_to_text', 'text_to_speech', 'image', 'sound');--> statement-breakpoint
CREATE TYPE "public"."ai_job_status" AS ENUM('queued', 'running', 'recovery_pending', 'succeeded', 'failed', 'cancelled', 'timed_out');--> statement-breakpoint
CREATE TYPE "public"."ai_job_submission_state" AS ENUM('not_submitted', 'accepted', 'unknown', 'manual_review');--> statement-breakpoint
CREATE TABLE "ai_concurrency_buckets" (
	"limit_units" integer NOT NULL,
	"running_units" integer DEFAULT 0 NOT NULL,
	"scope" "ai_concurrency_scope" NOT NULL,
	"scope_key" text PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	CONSTRAINT "ai_concurrency_buckets_limit_check" CHECK ("ai_concurrency_buckets"."limit_units" > 0),
	CONSTRAINT "ai_concurrency_buckets_running_check" CHECK ("ai_concurrency_buckets"."running_units" between 0 and "ai_concurrency_buckets"."limit_units")
);
--> statement-breakpoint
CREATE TABLE "ai_concurrency_reservations" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"job_id" uuid NOT NULL,
	"scope" "ai_concurrency_scope" NOT NULL,
	"scope_key" text NOT NULL,
	"units" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "ai_concurrency_reservations_job_id_scope_key_pk" PRIMARY KEY("job_id","scope_key"),
	CONSTRAINT "ai_concurrency_reservations_units_check" CHECK ("ai_concurrency_reservations"."units" > 0)
);
--> statement-breakpoint
CREATE TABLE "ai_cost_ledger" (
	"actual_cost_micros" bigint,
	"billed_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" varchar(3),
	"estimated_cost_micros" bigint,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"model_id" varchar(128) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"rate_version" varchar(128),
	"retention_until" timestamp with time zone NOT NULL,
	"status" "ai_cost_ledger_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_cost_ledger_estimated_cost_check" CHECK ("ai_cost_ledger"."estimated_cost_micros" is null or "ai_cost_ledger"."estimated_cost_micros" >= 0),
	CONSTRAINT "ai_cost_ledger_actual_cost_check" CHECK ("ai_cost_ledger"."actual_cost_micros" is null or "ai_cost_ledger"."actual_cost_micros" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_job_artifacts" (
	"archive_pending_at" timestamp with time zone,
	"content_type" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delete_attempts" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone,
	"duration_ms" integer,
	"expires_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"last_delete_error" text,
	"lifecycle" "ai_artifact_lifecycle" DEFAULT 'temporary' NOT NULL,
	"object_key" text NOT NULL,
	"pending_object_key" text,
	"retention_class" "ai_artifact_retention_class" NOT NULL,
	"saved_at" timestamp with time zone,
	"size_bytes" bigint,
	"source_object_key" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "ai_job_artifacts_size_check" CHECK ("ai_job_artifacts"."size_bytes" is null or "ai_job_artifacts"."size_bytes" >= 0),
	CONSTRAINT "ai_job_artifacts_duration_check" CHECK ("ai_job_artifacts"."duration_ms" is null or "ai_job_artifacts"."duration_ms" >= 0),
	CONSTRAINT "ai_job_artifacts_pending_key_check" CHECK (("ai_job_artifacts"."lifecycle" in ('archiving', 'deletion_pending') and "ai_job_artifacts"."pending_object_key" is not null)
        or ("ai_job_artifacts"."lifecycle" not in ('archiving', 'deletion_pending') and "ai_job_artifacts"."pending_object_key" is null)),
	CONSTRAINT "ai_job_artifacts_delete_attempts_check" CHECK ("ai_job_artifacts"."delete_attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_jobs" (
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"capability" "ai_job_capability" NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatch_lease_until" timestamp with time zone,
	"error_code" varchar(64),
	"error_message" text,
	"estimated_credits" integer,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"last_runner_error" text,
	"last_submission_error" text,
	"model_id" varchar(128) NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"provider_accepted_at" timestamp with time zone,
	"quota_units" integer DEFAULT 1 NOT NULL,
	"recovery_attempts" integer DEFAULT 0 NOT NULL,
	"recovery_deadline_at" timestamp with time zone,
	"request" jsonb NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result" jsonb,
	"runner_job_id" varchar(255),
	"settled_credits" integer,
	"started_at" timestamp with time zone,
	"status" "ai_job_status" DEFAULT 'queued' NOT NULL,
	"submission_state" "ai_job_submission_state" DEFAULT 'not_submitted' NOT NULL,
	"timeout_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"usage_period_end" date,
	"usage_period_start" date NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "ai_jobs_attempt_count_check" CHECK ("ai_jobs"."attempt_count" >= 0),
	CONSTRAINT "ai_jobs_progress_check" CHECK ("ai_jobs"."progress" between 0 and 100),
	CONSTRAINT "ai_jobs_quota_units_check" CHECK ("ai_jobs"."quota_units" > 0),
	CONSTRAINT "ai_jobs_recovery_attempts_check" CHECK ("ai_jobs"."recovery_attempts" >= 0),
	CONSTRAINT "ai_jobs_estimated_credits_check" CHECK ("ai_jobs"."estimated_credits" is null or "ai_jobs"."estimated_credits" >= 0),
	CONSTRAINT "ai_jobs_settled_credits_check" CHECK ("ai_jobs"."settled_credits" is null or "ai_jobs"."settled_credits" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ai_usage_buckets" (
	"consumed_credits" integer DEFAULT 0 NOT NULL,
	"consumed_units" integer DEFAULT 0 NOT NULL,
	"period_start" date NOT NULL,
	"reserved_credits" integer DEFAULT 0 NOT NULL,
	"reserved_units" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "ai_usage_buckets_user_id_period_start_pk" PRIMARY KEY("user_id","period_start"),
	CONSTRAINT "ai_usage_buckets_consumed_units_check" CHECK ("ai_usage_buckets"."consumed_units" >= 0),
	CONSTRAINT "ai_usage_buckets_reserved_units_check" CHECK ("ai_usage_buckets"."reserved_units" >= 0),
	CONSTRAINT "ai_usage_buckets_consumed_credits_check" CHECK ("ai_usage_buckets"."consumed_credits" >= 0),
	CONSTRAINT "ai_usage_buckets_reserved_credits_check" CHECK ("ai_usage_buckets"."reserved_credits" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ai_concurrency_buckets" ADD CONSTRAINT "ai_concurrency_buckets_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_concurrency_reservations" ADD CONSTRAINT "ai_concurrency_reservations_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_concurrency_reservations" ADD CONSTRAINT "ai_concurrency_reservations_scope_key_ai_concurrency_buckets_scope_key_fk" FOREIGN KEY ("scope_key") REFERENCES "public"."ai_concurrency_buckets"("scope_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_cost_ledger" ADD CONSTRAINT "ai_cost_ledger_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_job_artifacts" ADD CONSTRAINT "ai_job_artifacts_job_id_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_job_artifacts" ADD CONSTRAINT "ai_job_artifacts_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_buckets" ADD CONSTRAINT "ai_usage_buckets_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_concurrency_buckets_user_scope_index" ON "ai_concurrency_buckets" USING btree ("user_id","scope");--> statement-breakpoint
CREATE INDEX "ai_concurrency_reservations_scope_index" ON "ai_concurrency_reservations" USING btree ("scope_key","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_cost_ledger_job_index" ON "ai_cost_ledger" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ai_cost_ledger_retention_index" ON "ai_cost_ledger" USING btree ("retention_until");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_job_artifacts_object_key_index" ON "ai_job_artifacts" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_job_artifacts_job_index" ON "ai_job_artifacts" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "ai_job_artifacts_expiry_index" ON "ai_job_artifacts" USING btree ("lifecycle","expires_at");--> statement-breakpoint
CREATE INDEX "ai_job_artifacts_user_index" ON "ai_job_artifacts" USING btree ("user_id","lifecycle");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_jobs_user_idempotency_index" ON "ai_jobs" USING btree ("user_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "ai_jobs_user_created_at_index" ON "ai_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_jobs_recovery_index" ON "ai_jobs" USING btree ("status","dispatch_lease_until","timeout_at");