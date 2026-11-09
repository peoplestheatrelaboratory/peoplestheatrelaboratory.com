import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres';
export async function up({ db }: MigrateUpArgs) {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS ptl_storage_budget (key text PRIMARY KEY, used bigint NOT NULL CHECK (used >= 0));`);
}
export async function down({ db }: MigrateDownArgs) {
  await db.execute(sql`DROP TABLE IF EXISTS ptl_storage_budget;`);
}
