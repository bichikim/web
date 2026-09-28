CREATE TYPE "public"."commerce_order_reservation_status" AS ENUM('active', 'released');--> statement-breakpoint
CREATE TABLE "commerce_order_reservations" (
	"attempt_key" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"released_at" timestamp with time zone,
	"status" "commerce_order_reservation_status" DEFAULT 'active' NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "commerce_order_reservations_release_check" CHECK (("commerce_order_reservations"."status" = 'active' and "commerce_order_reservations"."released_at" is null)
        or ("commerce_order_reservations"."status" = 'released' and "commerce_order_reservations"."released_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "commerce_orders" ALTER COLUMN "provider_order_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD COLUMN "amount_minor" bigint;--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD COLUMN "currency" varchar(3);--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD COLUMN "fractional_digits" smallint;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD COLUMN "provider_external_product_id" varchar(255);--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN "provider_payment_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD COLUMN "provider_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "commerce_provider_events" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "commerce_provider_events" ADD COLUMN "claimed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_provider_events" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "commerce_order_reservations" ADD CONSTRAINT "commerce_order_reservations_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_reservations" ADD CONSTRAINT "commerce_order_reservations_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_reservations" ADD CONSTRAINT "commerce_order_reservations_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_order_reservations_attempt_key_index" ON "commerce_order_reservations" USING btree ("attempt_key");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_order_reservations_order_index" ON "commerce_order_reservations" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_order_reservations_active_user_product_index" ON "commerce_order_reservations" USING btree ("user_id","product_id") WHERE "commerce_order_reservations"."status" = 'active';--> statement-breakpoint
CREATE INDEX "commerce_order_reservations_status_expiry_index" ON "commerce_order_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_provider_payment_intent_index" ON "commerce_orders" USING btree ("provider","provider_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_provider_session_index" ON "commerce_orders" USING btree ("provider","provider_session_id");--> statement-breakpoint
CREATE INDEX "commerce_provider_events_status_next_attempt_index" ON "commerce_provider_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD CONSTRAINT "commerce_offers_amount_minor_check" CHECK ("commerce_offers"."amount_minor" is null or "commerce_offers"."amount_minor" >= 0);--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD CONSTRAINT "commerce_offers_currency_check" CHECK ("commerce_offers"."currency" is null or "commerce_offers"."currency" ~ '^[A-Z]{3}$');--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD CONSTRAINT "commerce_offers_fractional_digits_check" CHECK ("commerce_offers"."fractional_digits" is null or "commerce_offers"."fractional_digits" between 0 and 6);--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD CONSTRAINT "commerce_offers_price_metadata_check" CHECK (("commerce_offers"."amount_minor" is null and "commerce_offers"."currency" is null and "commerce_offers"."fractional_digits" is null)
        or ("commerce_offers"."amount_minor" is not null and "commerce_offers"."currency" is not null
          and "commerce_offers"."fractional_digits" is not null));--> statement-breakpoint
ALTER TABLE "commerce_provider_events" ADD CONSTRAINT "commerce_provider_events_attempt_count_check" CHECK ("commerce_provider_events"."attempt_count" >= 0);