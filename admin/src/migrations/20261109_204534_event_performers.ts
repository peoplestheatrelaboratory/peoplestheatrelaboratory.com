import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "events_performers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"part" varchar
  );
  
  CREATE TABLE "_events_v_version_performers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"part" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "events_performers" ADD CONSTRAINT "events_performers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_performers" ADD CONSTRAINT "_events_v_version_performers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_performers_order_idx" ON "events_performers" USING btree ("_order");
  CREATE INDEX "events_performers_parent_id_idx" ON "events_performers" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_performers_order_idx" ON "_events_v_version_performers" USING btree ("_order");
  CREATE INDEX "_events_v_version_performers_parent_id_idx" ON "_events_v_version_performers" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "events_performers" CASCADE;
  DROP TABLE "_events_v_version_performers" CASCADE;`)
}
