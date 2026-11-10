import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_gathering_mode" AS ENUM('automatic', 'selected', 'hidden');
  CREATE TABLE "site_settings_video_variants" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"min_width" numeric DEFAULT 0 NOT NULL,
  	"mp4" varchar,
  	"webm" varchar
  );
  
  CREATE TABLE "site_settings_footer_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"detail" varchar,
  	"href" varchar NOT NULL,
  	"new_tab" boolean DEFAULT true
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"couplet" varchar NOT NULL,
  	"translation" varchar NOT NULL,
  	"attribution" varchar NOT NULL,
  	"poster" varchar,
  	"gathering_mode" "enum_site_settings_gathering_mode" DEFAULT 'automatic' NOT NULL,
  	"featured_event_id" integer,
  	"next_label" varchar NOT NULL,
  	"past_label" varchar NOT NULL,
  	"booking_label" varchar NOT NULL,
  	"details_label" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"phone_href" varchar NOT NULL,
  	"footer_heading" varchar NOT NULL,
  	"copyright_name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "site_settings_video_variants" ADD CONSTRAINT "site_settings_video_variants_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_footer_links" ADD CONSTRAINT "site_settings_footer_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_featured_event_id_events_id_fk" FOREIGN KEY ("featured_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_video_variants_order_idx" ON "site_settings_video_variants" USING btree ("_order");
  CREATE INDEX "site_settings_video_variants_parent_id_idx" ON "site_settings_video_variants" USING btree ("_parent_id");
  CREATE INDEX "site_settings_footer_links_order_idx" ON "site_settings_footer_links" USING btree ("_order");
  CREATE INDEX "site_settings_footer_links_parent_id_idx" ON "site_settings_footer_links" USING btree ("_parent_id");
  CREATE INDEX "site_settings_featured_event_idx" ON "site_settings" USING btree ("featured_event_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "site_settings_video_variants" CASCADE;
  DROP TABLE "site_settings_footer_links" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TYPE "public"."enum_site_settings_gathering_mode";`)
}
