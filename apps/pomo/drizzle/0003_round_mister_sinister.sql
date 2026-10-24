CREATE TYPE "public"."pomo_identity_provider" AS ENUM('neon', 'toss');--> statement-breakpoint
CREATE TABLE "pomo_account_link_challenges" (
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pomo_app_sessions" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pomo_identities" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "pomo_identity_provider" NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pomo_users" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pomo_account_link_challenges" ADD CONSTRAINT "pomo_account_link_challenges_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomo_app_sessions" ADD CONSTRAINT "pomo_app_sessions_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomo_identities" ADD CONSTRAINT "pomo_identities_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pomo_account_link_challenges_token_hash_index" ON "pomo_account_link_challenges" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "pomo_account_link_challenges_expiry_index" ON "pomo_account_link_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pomo_app_sessions_token_hash_index" ON "pomo_app_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "pomo_app_sessions_user_expiry_index" ON "pomo_app_sessions" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pomo_identities_provider_subject_index" ON "pomo_identities" USING btree ("provider","provider_subject");--> statement-breakpoint
CREATE UNIQUE INDEX "pomo_identities_user_provider_index" ON "pomo_identities" USING btree ("user_id","provider");
