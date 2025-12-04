CREATE TABLE "user_anniversaries" (
	"date" date NOT NULL,
	"description" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_lunar" boolean DEFAULT false NOT NULL,
	"owner_id" uuid NOT NULL,
	"remind_days_before" integer,
	"repeat_type" text DEFAULT 'yearly' NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_anniversaries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_anniversaries" ADD CONSTRAINT "user_anniversaries_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_anniversaries_insert_policy" ON "user_anniversaries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_update_policy" ON "user_anniversaries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid()) WITH CHECK ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_delete_policy" ON "user_anniversaries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_select_policy" ON "user_anniversaries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid());
