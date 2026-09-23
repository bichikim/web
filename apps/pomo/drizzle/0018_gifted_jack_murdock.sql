CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'microsoft');--> statement-breakpoint
CREATE TABLE "calendar_connections" (
	"account_label" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_tokens" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"provider_subject" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_oauth_states" (
	"code_verifier" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"redirect_uri" varchar(2048) NOT NULL,
	"state_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "calendar_oauth_states_state_hash_provider_pk" PRIMARY KEY("state_hash","provider")
);
--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_oauth_states" ADD CONSTRAINT "calendar_oauth_states_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_user_provider_subject_index" ON "calendar_connections" USING btree ("user_id","provider","provider_subject");--> statement-breakpoint
CREATE INDEX "calendar_connections_user_index" ON "calendar_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_oauth_states_expiry_index" ON "calendar_oauth_states" USING btree ("expires_at");