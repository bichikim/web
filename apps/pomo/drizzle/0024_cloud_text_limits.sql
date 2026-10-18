CREATE TABLE "cloud_text_limits" (
	"daily_limit" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid PRIMARY KEY NOT NULL,
	CONSTRAINT "cloud_text_limits_daily_limit_check" CHECK ("cloud_text_limits"."daily_limit" >= 0 and "cloud_text_limits"."daily_limit" <= 10000)
);
--> statement-breakpoint
ALTER TABLE "cloud_text_limits" ADD CONSTRAINT "cloud_text_limits_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;