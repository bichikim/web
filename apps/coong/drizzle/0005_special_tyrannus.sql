CREATE TABLE "anniversary_people" (
	"anniversary_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	CONSTRAINT "anniversary_people_anniversary_id_person_id_pk" PRIMARY KEY("anniversary_id","person_id")
);
--> statement-breakpoint
ALTER TABLE "anniversary_people" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
ALTER TABLE "profiles" DROP COLUMN "age";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "person_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "anniversary_people" ADD CONSTRAINT "anniversary_people_anniversary_id_user_anniversaries_id_fk" FOREIGN KEY ("anniversary_id") REFERENCES "public"."user_anniversaries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anniversary_people" ADD CONSTRAINT "anniversary_people_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
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
      ));

