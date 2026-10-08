CREATE TABLE "api_ai_routing" (
	"kind" varchar(32) PRIMARY KEY NOT NULL,
	"revision" integer NOT NULL,
	"routing" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_ai_routing_kind_check" CHECK ("api_ai_routing"."kind" in ('cloud-text', 'history')),
	CONSTRAINT "api_ai_routing_revision_check" CHECK ("api_ai_routing"."revision" > 0)
);
--> statement-breakpoint
ALTER TABLE "api_ai_jobs" ADD COLUMN "routing" jsonb;