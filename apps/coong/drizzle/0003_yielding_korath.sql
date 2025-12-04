ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_owner_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
CREATE POLICY "user_roles_select_policy" ON "user_roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("user_roles"."owner_id" = auth.uid());--> statement-breakpoint
ALTER POLICY "profiles_select_policy" ON "profiles" TO authenticated USING (EXISTS (
    SELECT 1 FROM "profiles"
    WHERE "profiles"."id" = auth.uid()
  ));