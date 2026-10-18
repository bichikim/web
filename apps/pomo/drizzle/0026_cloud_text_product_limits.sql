CREATE TABLE "cloud_text_product_limits" (
	"daily_limit" integer,
	"product_id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cloud_text_product_limits_daily_limit_check" CHECK ("cloud_text_product_limits"."daily_limit" is null or "cloud_text_product_limits"."daily_limit" between 0 and 10000)
);
--> statement-breakpoint
ALTER TABLE "cloud_text_limits" ALTER COLUMN "daily_limit" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cloud_text_product_limits" ADD CONSTRAINT "cloud_text_product_limits_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE cascade ON UPDATE no action;