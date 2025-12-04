CREATE TABLE "anniversary_people" (
	"anniversary_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "anniversary_people_anniversary_id_person_id_pk" PRIMARY KEY("anniversary_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "anniversary_people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "music_posts_comments" (
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_posts_comments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "music_posts" (
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "people" (
	"age" integer,
	"email" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"image" text,
	"person_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "table" (
	"serial" serial NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "anniversary_people" ADD CONSTRAINT "anniversary_people_anniversary_id_user_anniversaries_id_fk" FOREIGN KEY ("anniversary_id") REFERENCES "public"."user_anniversaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anniversary_people" ADD CONSTRAINT "anniversary_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_posts_comments" ADD CONSTRAINT "music_posts_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_posts_comments" ADD CONSTRAINT "music_posts_comments_post_id_music_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."music_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_posts" ADD CONSTRAINT "music_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_anniversaries" ADD CONSTRAINT "user_anniversaries_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "anniversary_people_insert_policy" ON "anniversary_people" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "anniversary_people_update_policy" ON "anniversary_people" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "anniversary_people_delete_policy" ON "anniversary_people" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "anniversary_people_select_policy" ON "anniversary_people" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "music_post_comments_insert_policy" ON "music_posts_comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_update_policy" ON "music_posts_comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("music_posts_comments"."author_id" = auth.uid()) WITH CHECK ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_delete_policy" ON "music_posts_comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_select_policy" ON "music_posts_comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "music_posts_insert_policy" ON "music_posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_update_policy" ON "music_posts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("music_posts"."author_id" = auth.uid()) WITH CHECK ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_delete_policy" ON "music_posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_select_policy" ON "music_posts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "people_insert_policy" ON "people" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "people_update_policy" ON "people" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = auth.uid()
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "people_delete_policy" ON "people" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "people_select_policy" ON "people" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "profiles_insert_policy" ON "profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_update_policy" ON "profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("profiles"."id" = auth.uid()) WITH CHECK ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_delete_policy" ON "profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("profiles"."id" = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_select_policy" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
    SELECT 1 FROM "profiles"
    WHERE "profiles"."id" = auth.uid()
  ));--> statement-breakpoint
CREATE POLICY "user_anniversaries_insert_policy" ON "user_anniversaries" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_update_policy" ON "user_anniversaries" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid()) WITH CHECK ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_delete_policy" ON "user_anniversaries" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_anniversaries_select_policy" ON "user_anniversaries" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_anniversaries"."owner_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "user_roles_insert_policy" ON "user_roles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (
    SELECT 1 FROM $1
    WHERE "user_roles"."owner_id" = auth.uid()
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
CREATE POLICY "user_roles_update_policy" ON "user_roles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM $1
    WHERE "user_roles"."owner_id" = auth.uid()
    AND "user_roles"."role" = '$admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM $1
    WHERE "user_roles"."owner_id" = auth.uid()
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
CREATE POLICY "user_roles_delete_policy" ON "user_roles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (
    SELECT 1 FROM $1
    WHERE "user_roles"."owner_id" = auth.uid()
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
CREATE POLICY "user_roles_select_policy" ON "user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_roles"."owner_id" = auth.uid());