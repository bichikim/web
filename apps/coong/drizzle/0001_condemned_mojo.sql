ALTER POLICY "anniversary_people_insert_policy" ON "anniversary_people" TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "anniversary_people_update_policy" ON "anniversary_people" TO authenticated USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = (select auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "anniversary_people_delete_policy" ON "anniversary_people" TO authenticated USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "anniversary_people_select_policy" ON "anniversary_people" TO authenticated USING (EXISTS (
        SELECT 1 FROM "user_anniversaries"
        WHERE "user_anniversaries"."id" = "anniversary_people"."anniversary_id"
        AND "user_anniversaries"."owner_id" = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "music_post_comments_insert_policy" ON "music_posts_comments" TO authenticated WITH CHECK ("music_posts_comments"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "music_post_comments_update_policy" ON "music_posts_comments" TO authenticated USING ("music_posts_comments"."author_id" = (select auth.uid())) WITH CHECK ("music_posts_comments"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "music_post_comments_delete_policy" ON "music_posts_comments" TO authenticated USING ("music_posts_comments"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "music_posts_insert_policy" ON "music_posts" TO authenticated WITH CHECK ("music_posts"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "music_posts_update_policy" ON "music_posts" TO authenticated USING ("music_posts"."author_id" = (select auth.uid())) WITH CHECK ("music_posts"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "music_posts_delete_policy" ON "music_posts" TO authenticated USING ("music_posts"."author_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "people_insert_policy" ON "people" TO authenticated WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "people_update_policy" ON "people" TO authenticated USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = (select auth.uid())
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "people_delete_policy" ON "people" TO authenticated USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "people_select_policy" ON "people" TO authenticated USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = "people"."owner_id"
        AND profiles.id = (select auth.uid())
      ));--> statement-breakpoint
ALTER POLICY "profiles_insert_policy" ON "profiles" TO authenticated WITH CHECK ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "profiles_update_policy" ON "profiles" TO authenticated USING ("profiles"."id" = (select auth.uid())) WITH CHECK ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "profiles_delete_policy" ON "profiles" TO authenticated USING ("profiles"."id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "profiles_select_policy" ON "profiles" TO authenticated USING (EXISTS (
    SELECT 1 FROM "profiles"
    WHERE "profiles"."id" = (select auth.uid())
  ));--> statement-breakpoint
ALTER POLICY "user_anniversaries_insert_policy" ON "user_anniversaries" TO authenticated WITH CHECK ("user_anniversaries"."owner_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "user_anniversaries_update_policy" ON "user_anniversaries" TO authenticated USING ("user_anniversaries"."owner_id" = (select auth.uid())) WITH CHECK ("user_anniversaries"."owner_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "user_anniversaries_delete_policy" ON "user_anniversaries" TO authenticated USING ("user_anniversaries"."owner_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "user_anniversaries_select_policy" ON "user_anniversaries" TO authenticated USING ("user_anniversaries"."owner_id" = (select auth.uid()));--> statement-breakpoint
ALTER POLICY "user_roles_insert_policy" ON "user_roles" TO authenticated WITH CHECK (EXISTS (
    SELECT 1 FROM "user_roles"
    WHERE "user_roles"."owner_id" = (select auth.uid())
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
ALTER POLICY "user_roles_update_policy" ON "user_roles" TO authenticated USING (EXISTS (
    SELECT 1 FROM "user_roles"
    WHERE "user_roles"."owner_id" = (select auth.uid())
    AND "user_roles"."role" = '$admin'
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM "user_roles"
    WHERE "user_roles"."owner_id" = (select auth.uid())
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
ALTER POLICY "user_roles_delete_policy" ON "user_roles" TO authenticated USING (EXISTS (
    SELECT 1 FROM "user_roles"
    WHERE "user_roles"."owner_id" = (select auth.uid())
    AND "user_roles"."role" = '$admin'
  ));--> statement-breakpoint
ALTER POLICY "user_roles_select_policy" ON "user_roles" TO authenticated USING ("user_roles"."owner_id" = (select auth.uid()));