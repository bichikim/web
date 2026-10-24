CREATE TYPE "public"."commerce_offer_billing_type" AS ENUM('one_time', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."commerce_offer_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."commerce_order_status" AS ENUM('pending', 'paid', 'partially_refunded', 'refunded', 'canceled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."commerce_product_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."commerce_provider_event_status" AS ENUM('received', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."music_album_locale" AS ENUM('ko', 'en', 'ja', 'zh-Hans');--> statement-breakpoint
CREATE TYPE "public"."music_album_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."music_cover_fallback" AS ENUM('lp', 'cd', 'music');--> statement-breakpoint
CREATE TYPE "public"."music_track_asset_status" AS ENUM('pending', 'uploaded', 'ready', 'active', 'failed', 'retired', 'deleted');--> statement-breakpoint
CREATE TABLE "commerce_entitlement_grants" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "commerce_entitlement_grants_period_check" CHECK ("commerce_entitlement_grants"."ends_at" is null or "commerce_entitlement_grants"."ends_at" > "commerce_entitlement_grants"."starts_at"),
	CONSTRAINT "commerce_entitlement_grants_revocation_check" CHECK (("commerce_entitlement_grants"."revoked_at" is null and "commerce_entitlement_grants"."revoke_reason" is null)
        or ("commerce_entitlement_grants"."revoked_at" is not null and "commerce_entitlement_grants"."revoke_reason" is not null))
);
--> statement-breakpoint
CREATE TABLE "commerce_offers" (
	"billing_type" "commerce_offer_billing_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"external_product_id" varchar(255) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"status" "commerce_offer_status" DEFAULT 'inactive' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_order_items" (
	"amount_minor" bigint NOT NULL,
	"currency" varchar(3) NOT NULL,
	"fractional_digits" smallint NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"product_code" varchar(128) NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "commerce_order_items_amount_minor_check" CHECK ("commerce_order_items"."amount_minor" >= 0),
	CONSTRAINT "commerce_order_items_currency_check" CHECK ("commerce_order_items"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "commerce_order_items_fractional_digits_check" CHECK ("commerce_order_items"."fractional_digits" between 0 and 6),
	CONSTRAINT "commerce_order_items_quantity_check" CHECK ("commerce_order_items"."quantity" = 1)
);
--> statement-breakpoint
CREATE TABLE "commerce_orders" (
	"amount_minor" bigint NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency" varchar(3) NOT NULL,
	"failed_at" timestamp with time zone,
	"fractional_digits" smallint NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"offer_id" uuid NOT NULL,
	"paid_at" timestamp with time zone,
	"payment_method" varchar(64),
	"provider" varchar(64) NOT NULL,
	"provider_order_id" varchar(255) NOT NULL,
	"refunded_amount_minor" bigint DEFAULT 0 NOT NULL,
	"refunded_at" timestamp with time zone,
	"status" "commerce_order_status" DEFAULT 'pending' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "commerce_orders_amount_minor_check" CHECK ("commerce_orders"."amount_minor" >= 0),
	CONSTRAINT "commerce_orders_refunded_amount_check" CHECK ("commerce_orders"."refunded_amount_minor" between 0 and "commerce_orders"."amount_minor"),
	CONSTRAINT "commerce_orders_currency_check" CHECK ("commerce_orders"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "commerce_orders_fractional_digits_check" CHECK ("commerce_orders"."fractional_digits" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "commerce_product_albums" (
	"album_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	CONSTRAINT "commerce_product_albums_product_id_album_id_pk" PRIMARY KEY("product_id","album_id")
);
--> statement-breakpoint
CREATE TABLE "commerce_products" (
	"code" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "commerce_product_status" DEFAULT 'active' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commerce_provider_events" (
	"error_code" varchar(64),
	"event_type" varchar(128) NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone,
	"provider" varchar(64) NOT NULL,
	"provider_event_id" varchar(255) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "commerce_provider_event_status" DEFAULT 'received' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_album_tracks" (
	"album_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"track_id" uuid NOT NULL,
	CONSTRAINT "music_album_tracks_album_id_track_id_pk" PRIMARY KEY("album_id","track_id"),
	CONSTRAINT "music_album_tracks_position_check" CHECK ("music_album_tracks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "music_album_translations" (
	"album_id" uuid NOT NULL,
	"description" text NOT NULL,
	"locale" "music_album_locale" NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_album_translations_album_id_locale_pk" PRIMARY KEY("album_id","locale")
);
--> statement-breakpoint
CREATE TABLE "music_albums" (
	"cover_fallback" "music_cover_fallback" DEFAULT 'lp' NOT NULL,
	"cover_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"published_at" timestamp with time zone,
	"status" "music_album_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "music_albums_cover_image_url_check" CHECK ("music_albums"."cover_image_url" is null or "music_albums"."cover_image_url" like 'https://%'),
	CONSTRAINT "music_albums_published_at_check" CHECK (("music_albums"."status" = 'draft' and "music_albums"."published_at" is null)
        or ("music_albums"."status" in ('published', 'archived') and "music_albums"."published_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "music_track_assets" (
	"activated_at" timestamp with time zone,
	"content_type" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"duration_ms" integer,
	"etag" varchar(255),
	"failure_code" varchar(64),
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_key" text NOT NULL,
	"retired_at" timestamp with time zone,
	"size_bytes" bigint,
	"status" "music_track_asset_status" DEFAULT 'pending' NOT NULL,
	"storage_role" varchar(32) DEFAULT 'paid-private' NOT NULL,
	"track_id" uuid NOT NULL,
	"uploaded_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	CONSTRAINT "music_track_assets_storage_role_check" CHECK ("music_track_assets"."storage_role" = 'paid-private'),
	CONSTRAINT "music_track_assets_object_key_check" CHECK ("music_track_assets"."object_key"
        = 'tracks/' || "music_track_assets"."track_id"::text || '/' || "music_track_assets"."id"::text || '/source.mp3'),
	CONSTRAINT "music_track_assets_content_type_check" CHECK ("music_track_assets"."content_type" is null or "music_track_assets"."content_type" = 'audio/mpeg'),
	CONSTRAINT "music_track_assets_size_bytes_check" CHECK ("music_track_assets"."size_bytes" is null or "music_track_assets"."size_bytes" > 0),
	CONSTRAINT "music_track_assets_duration_ms_check" CHECK ("music_track_assets"."duration_ms" is null or "music_track_assets"."duration_ms" > 0),
	CONSTRAINT "music_track_assets_uploaded_metadata_check" CHECK ("music_track_assets"."status" not in ('uploaded', 'ready', 'active', 'retired', 'deleted')
        or ("music_track_assets"."content_type" is not null and "music_track_assets"."size_bytes" is not null
          and "music_track_assets"."etag" is not null and "music_track_assets"."uploaded_at" is not null)),
	CONSTRAINT "music_track_assets_validated_metadata_check" CHECK ("music_track_assets"."status" not in ('ready', 'active', 'retired', 'deleted')
        or ("music_track_assets"."duration_ms" is not null and "music_track_assets"."validated_at" is not null)),
	CONSTRAINT "music_track_assets_activated_at_check" CHECK ("music_track_assets"."status" not in ('active', 'retired', 'deleted') or "music_track_assets"."activated_at" is not null),
	CONSTRAINT "music_track_assets_retired_at_check" CHECK ("music_track_assets"."status" not in ('retired', 'deleted') or "music_track_assets"."retired_at" is not null),
	CONSTRAINT "music_track_assets_deleted_at_check" CHECK ("music_track_assets"."status" <> 'deleted' or "music_track_assets"."deleted_at" is not null),
	CONSTRAINT "music_track_assets_failure_code_check" CHECK ("music_track_assets"."status" <> 'failed' or "music_track_assets"."failure_code" is not null)
);
--> statement-breakpoint
CREATE TABLE "music_track_deletion_jobs" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"object_keys" jsonb NOT NULL,
	"storage_deleted_at" timestamp with time zone,
	"track_id" uuid PRIMARY KEY NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "music_tracks" (
	"artist" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commerce_entitlement_grants" ADD CONSTRAINT "commerce_entitlement_grants_order_item_id_commerce_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."commerce_order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlement_grants" ADD CONSTRAINT "commerce_entitlement_grants_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_entitlement_grants" ADD CONSTRAINT "commerce_entitlement_grants_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_offers" ADD CONSTRAINT "commerce_offers_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_offer_id_commerce_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."commerce_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_order_id_commerce_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."commerce_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_order_items" ADD CONSTRAINT "commerce_order_items_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_offer_id_commerce_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."commerce_offers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_orders" ADD CONSTRAINT "commerce_orders_user_id_pomo_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."pomo_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_product_albums" ADD CONSTRAINT "commerce_product_albums_album_id_music_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."music_albums"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commerce_product_albums" ADD CONSTRAINT "commerce_product_albums_product_id_commerce_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."commerce_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_album_tracks" ADD CONSTRAINT "music_album_tracks_album_id_music_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."music_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_album_tracks" ADD CONSTRAINT "music_album_tracks_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_album_translations" ADD CONSTRAINT "music_album_translations_album_id_music_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."music_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_track_assets" ADD CONSTRAINT "music_track_assets_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "music_track_deletion_jobs" ADD CONSTRAINT "music_track_deletion_jobs_track_id_music_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."music_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_entitlement_grants_order_item_index" ON "commerce_entitlement_grants" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "commerce_entitlement_grants_access_index" ON "commerce_entitlement_grants" USING btree ("user_id","product_id","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_offers_provider_external_product_index" ON "commerce_offers" USING btree ("provider","external_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_offers_product_provider_index" ON "commerce_offers" USING btree ("product_id","provider");--> statement-breakpoint
CREATE INDEX "commerce_offers_product_status_index" ON "commerce_offers" USING btree ("product_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_order_items_order_offer_index" ON "commerce_order_items" USING btree ("order_id","offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_orders_provider_order_index" ON "commerce_orders" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "commerce_orders_user_created_at_index" ON "commerce_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_products_code_index" ON "commerce_products" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "commerce_provider_events_provider_event_index" ON "commerce_provider_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "commerce_provider_events_status_received_at_index" ON "commerce_provider_events" USING btree ("status","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "music_album_tracks_album_position_index" ON "music_album_tracks" USING btree ("album_id","position");--> statement-breakpoint
CREATE INDEX "music_album_translations_locale_album_id_index" ON "music_album_translations" USING btree ("locale","album_id");--> statement-breakpoint
CREATE INDEX "music_albums_status_published_at_index" ON "music_albums" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "music_track_assets_object_key_index" ON "music_track_assets" USING btree ("object_key");--> statement-breakpoint
CREATE UNIQUE INDEX "music_track_assets_active_track_index" ON "music_track_assets" USING btree ("track_id") WHERE "music_track_assets"."status" = 'active';--> statement-breakpoint
CREATE INDEX "music_track_assets_status_created_at_index" ON "music_track_assets" USING btree ("status","created_at");