CREATE TABLE "cloud_text_requests" (
	"day" date NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"result" text,
	"status" varchar(16) NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "cloud_text_requests_token_count_check" CHECK ("cloud_text_requests"."token_count" >= 0),
	CONSTRAINT "cloud_text_requests_status_check" CHECK ("cloud_text_requests"."status" in ('pending', 'complete', 'failed')),
	CONSTRAINT "cloud_text_requests_result_check" CHECK (("cloud_text_requests"."status" = 'complete') = ("cloud_text_requests"."result" is not null))
);
--> statement-breakpoint
ALTER TABLE "cloud_text_requests" ADD CONSTRAINT "cloud_text_requests_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cloud_text_requests_user_day_index" ON "cloud_text_requests" USING btree ("user_id","day");