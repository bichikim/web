CREATE TABLE "api_ai_attempts" (
	"billed_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deadline_at" timestamp with time zone NOT NULL,
	"error_message" text,
	"id" uuid PRIMARY KEY NOT NULL,
	"job_id" uuid NOT NULL,
	"model_id" text NOT NULL,
	"pool_id" text NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"response_id" text,
	"retry_at" timestamp with time zone,
	"state" varchar(32) NOT NULL,
	"token_reservation" integer NOT NULL,
	CONSTRAINT "api_ai_attempts_state_check" CHECK ("api_ai_attempts"."state" in ('submitting', 'running', 'unknown', 'succeeded', 'rejected', 'failed', 'cancelled')),
	CONSTRAINT "api_ai_attempts_tokens_check" CHECK ("api_ai_attempts"."token_reservation" >= 0)
);
--> statement-breakpoint
CREATE TABLE "api_ai_callbacks" (
	"event_id" text NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"provider_id" varchar(64) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"response_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_ai_jobs" (
	"active_attempt_id" uuid,
	"body" jsonb NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"error_message" text,
	"execution_expires_at" timestamp with time zone,
	"generation_milliseconds" integer NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" varchar(32) NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"owner_id" uuid,
	"queue_expires_at" timestamp with time zone NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result" jsonb,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	CONSTRAINT "api_ai_jobs_kind_check" CHECK ("api_ai_jobs"."kind" in ('cloud-text', 'history')),
	CONSTRAINT "api_ai_jobs_status_check" CHECK ("api_ai_jobs"."status" in (
        'queued', 'submitting', 'running', 'recovery_pending', 'succeeded', 'failed', 'cancelled')),
	CONSTRAINT "api_ai_jobs_generation_check" CHECK ("api_ai_jobs"."generation_milliseconds" > 0)
);
--> statement-breakpoint
CREATE TABLE "api_ai_pools" (
	"blocked_until" timestamp with time zone,
	"disabled" text,
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloud_text_requests" ADD COLUMN "queue_job_id" uuid;--> statement-breakpoint
ALTER TABLE "api_ai_attempts" ADD CONSTRAINT "api_ai_attempts_job_id_api_ai_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."api_ai_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_ai_jobs" ADD CONSTRAINT "api_ai_jobs_owner_id_pomo_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."pomo_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_ai_attempts_pool_index" ON "api_ai_attempts" USING btree ("pool_id","state","created_at");--> statement-breakpoint
CREATE INDEX "api_ai_attempts_job_index" ON "api_ai_attempts" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_ai_attempts_response_index" ON "api_ai_attempts" USING btree ("provider_id","response_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_ai_callbacks_provider_event_index" ON "api_ai_callbacks" USING btree ("provider_id","event_id");--> statement-breakpoint
CREATE INDEX "api_ai_callbacks_pending_index" ON "api_ai_callbacks" USING btree ("processed_at","next_attempt_at","received_at");--> statement-breakpoint
CREATE INDEX "api_ai_jobs_dispatch_index" ON "api_ai_jobs" USING btree ("status","next_attempt_at","created_at");--> statement-breakpoint
CREATE INDEX "api_ai_jobs_delivery_index" ON "api_ai_jobs" USING btree ("status","delivered_at","next_attempt_at");--> statement-breakpoint
ALTER TABLE "cloud_text_requests" ADD CONSTRAINT "cloud_text_requests_queue_job_id_api_ai_jobs_id_fk" FOREIGN KEY ("queue_job_id") REFERENCES "public"."api_ai_jobs"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE FUNCTION notify_cloud_text_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('pomo_cloud_text_' || replace(NEW.id::text, '-', ''), '');
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER cloud_text_job_notification AFTER INSERT OR UPDATE ON cloud_text_requests
FOR EACH ROW EXECUTE FUNCTION notify_cloud_text_job();
--> statement-breakpoint
CREATE FUNCTION notify_api_ai_cloud_text_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.kind = 'cloud-text' THEN
    PERFORM pg_notify('pomo_cloud_text_' || replace(NEW.id::text, '-', ''), '');
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER api_ai_cloud_text_job_notification AFTER UPDATE ON api_ai_jobs
FOR EACH ROW EXECUTE FUNCTION notify_api_ai_cloud_text_job();
