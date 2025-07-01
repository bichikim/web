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
CREATE TABLE "table" (
	"serial" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"age" integer,
	"id" uuid PRIMARY KEY NOT NULL,
	"image" text,
	"name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "music_posts_comments" ADD CONSTRAINT "music_posts_comments_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_posts_comments" ADD CONSTRAINT "music_posts_comments_post_id_music_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."music_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_posts" ADD CONSTRAINT "music_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "music_post_comments_insert_policy" ON "music_posts_comments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_update_policy" ON "music_posts_comments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("music_posts_comments"."author_id" = auth.uid()) WITH CHECK ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_delete_policy" ON "music_posts_comments" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("music_posts_comments"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_post_comments_select_policy" ON "music_posts_comments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "music_posts_insert_policy" ON "music_posts" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_update_policy" ON "music_posts" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("music_posts"."author_id" = auth.uid()) WITH CHECK ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_delete_policy" ON "music_posts" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("music_posts"."author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "music_posts_select_policy" ON "music_posts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);