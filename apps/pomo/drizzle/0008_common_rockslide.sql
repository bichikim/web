CREATE TABLE "pomo_account_link_attempt_limits" (
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"user_id" uuid PRIMARY KEY NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pomo_account_link_attempt_limits_positive_count_check" CHECK ("pomo_account_link_attempt_limits"."attempt_count" > 0)
);
--> statement-breakpoint
ALTER TABLE "pomo_account_link_attempt_limits" ADD CONSTRAINT "pomo_account_link_attempt_limits_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;