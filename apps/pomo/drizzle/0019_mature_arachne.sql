CREATE TYPE "public"."feature_request_status" AS ENUM('requested', 'voting', 'confirmed', 'completed');--> statement-breakpoint
CREATE TABLE "feature_request_votes" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"request_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "feature_request_votes_request_id_user_id_pk" PRIMARY KEY("request_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "feature_request_status" DEFAULT 'requested' NOT NULL,
	"target_vote_count" integer,
	"title" varchar(120) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "feature_requests_target_vote_count_check" CHECK ("feature_requests"."target_vote_count" is null or "feature_requests"."target_vote_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "feature_request_votes" ADD CONSTRAINT "feature_request_votes_request_id_feature_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_request_votes" ADD CONSTRAINT "feature_request_votes_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_request_votes_user_index" ON "feature_request_votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_requests_status_created_at_index" ON "feature_requests" USING btree ("status","created_at");