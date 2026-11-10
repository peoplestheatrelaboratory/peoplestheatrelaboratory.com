import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "site_settings_hero_quotes" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "couplet" varchar NOT NULL,
    "translation" varchar,
    "attribution" varchar
  );

  ALTER TABLE "site_settings" ALTER COLUMN "couplet" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "translation" DROP NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "attribution" DROP NOT NULL;
  ALTER TABLE "site_settings_hero_quotes" ADD CONSTRAINT "site_settings_hero_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "site_settings_hero_quotes_order_idx" ON "site_settings_hero_quotes" USING btree ("_order");
  CREATE INDEX "site_settings_hero_quotes_parent_id_idx" ON "site_settings_hero_quotes" USING btree ("_parent_id");

  -- Carry the saved homepage quote into the new list without changing its text.
  INSERT INTO "site_settings_hero_quotes" ("_order", "_parent_id", "id", "couplet", "translation", "attribution")
  SELECT 1, "id", md5('homepage-quote-' || "id"::text), "couplet", NULLIF("translation", ''), NULLIF("attribution", '')
  FROM "site_settings"
  WHERE "couplet" IS NOT NULL AND btrim("couplet") <> '';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "site_settings" s SET
    "couplet" = q."couplet", "translation" = COALESCE(q."translation", ''), "attribution" = COALESCE(q."attribution", '')
   FROM "site_settings_hero_quotes" q
   WHERE q."_parent_id" = s."id" AND q."_order" = 1;
   UPDATE "site_settings" SET "couplet" = COALESCE("couplet", ''), "translation" = COALESCE("translation", ''), "attribution" = COALESCE("attribution", '');
   ALTER TABLE "site_settings_hero_quotes" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "site_settings_hero_quotes" CASCADE;
  ALTER TABLE "site_settings" ALTER COLUMN "couplet" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "translation" SET NOT NULL;
  ALTER TABLE "site_settings" ALTER COLUMN "attribution" SET NOT NULL;`)
}
