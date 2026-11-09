import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_sections" AS ENUM('events', 'library', 'blog', 'team', 'quotes');
  CREATE TYPE "public"."enum_users_role" AS ENUM('super-admin', 'editor', 'contributor');
  CREATE TYPE "public"."enum_artists_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__artists_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_songs_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__songs_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_events_series" AS ENUM('Baithak', 'Kabir Sang Ruhdaari', 'Production', 'Workshop');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_series" AS ENUM('Baithak', 'Kabir Sang Ruhdaari', 'Production', 'Workshop');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_team_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__team_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_blog_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__blog_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_scripts_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__scripts_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_quotes_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__quotes_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "users_sections" (
    "order" integer NOT NULL,
    "parent_id" integer NOT NULL,
    "value" "enum_users_sections",
    "id" serial PRIMARY KEY NOT NULL
  );

  CREATE TABLE "users_sessions" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "created_at" timestamp(3) with time zone,
    "expires_at" timestamp(3) with time zone NOT NULL
  );

  CREATE TABLE "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "role" "enum_users_role" DEFAULT 'contributor' NOT NULL,
    "can_publish" boolean DEFAULT false,
    "enabled" boolean DEFAULT true,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "email" varchar NOT NULL,
    "reset_password_token" varchar,
    "reset_password_expiration" timestamp(3) with time zone,
    "salt" varchar,
    "hash" varchar,
    "reset_password_requested_at" timestamp(3) with time zone,
    "login_attempts" numeric DEFAULT 0,
    "lock_until" timestamp(3) with time zone
  );

  CREATE TABLE "media" (
    "id" serial PRIMARY KEY NOT NULL,
    "alt" varchar NOT NULL,
    "public" boolean DEFAULT false,
    "prefix" varchar DEFAULT '',
    "_objectkey" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "url" varchar,
    "thumbnail_u_r_l" varchar,
    "filename" varchar,
    "mime_type" varchar,
    "filesize" numeric,
    "width" numeric,
    "height" numeric,
    "focal_x" numeric,
    "focal_y" numeric
  );

  CREATE TABLE "artists_roles" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "artists" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "name" varchar,
    "name_deva" varchar,
    "era" varchar,
    "link" varchar,
    "photo_id" integer,
    "note" jsonb,
    "note_imported" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_artists_status" DEFAULT 'draft'
  );

  CREATE TABLE "_artists_v_version_roles" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_artists_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_name" varchar,
    "version_name_deva" varchar,
    "version_era" varchar,
    "version_link" varchar,
    "version_photo_id" integer,
    "version_note" jsonb,
    "version_note_imported" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__artists_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "songs_language" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "songs_genre" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "songs_geography" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "songs_lyrics" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "stanza" varchar
  );

  CREATE TABLE "songs_references" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "label" varchar,
    "url" varchar
  );

  CREATE TABLE "songs" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "title" varchar,
    "title_latin" varchar,
    "raag" varchar,
    "meaning" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_songs_status" DEFAULT 'draft'
  );

  CREATE TABLE "songs_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer
  );

  CREATE TABLE "_songs_v_version_language" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_songs_v_version_genre" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_songs_v_version_geography" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_songs_v_version_lyrics" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "stanza" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_songs_v_version_references" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "label" varchar,
    "url" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_songs_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_title" varchar,
    "version_title_latin" varchar,
    "version_raag" varchar,
    "version_meaning" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__songs_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_songs_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer
  );

  CREATE TABLE "events_setlist" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "song_id" integer
  );

  CREATE TABLE "events" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "title" varchar,
    "title_deva" varchar,
    "series" "enum_events_series",
    "date" timestamp(3) with time zone,
    "tithi" varchar,
    "venue" varchar,
    "city" varchar,
    "summary" varchar,
    "register_url" varchar,
    "cover_id" integer,
    "body" jsonb,
    "body_imported" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_events_status" DEFAULT 'draft'
  );

  CREATE TABLE "events_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer
  );

  CREATE TABLE "_events_v_version_setlist" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "song_id" integer,
    "_uuid" varchar
  );

  CREATE TABLE "_events_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_title" varchar,
    "version_title_deva" varchar,
    "version_series" "enum__events_v_version_series",
    "version_date" timestamp(3) with time zone,
    "version_tithi" varchar,
    "version_venue" varchar,
    "version_city" varchar,
    "version_summary" varchar,
    "version_register_url" varchar,
    "version_cover_id" integer,
    "version_body" jsonb,
    "version_body_imported" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__events_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_events_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer
  );

  CREATE TABLE "team" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "name" varchar,
    "name_deva" varchar,
    "role" varchar,
    "order" numeric DEFAULT 0,
    "photo_id" integer,
    "socials" varchar,
    "bio" jsonb,
    "bio_imported" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_team_status" DEFAULT 'draft'
  );

  CREATE TABLE "_team_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_name" varchar,
    "version_name_deva" varchar,
    "version_role" varchar,
    "version_order" numeric DEFAULT 0,
    "version_photo_id" integer,
    "version_socials" varchar,
    "version_bio" jsonb,
    "version_bio_imported" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__team_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "blog_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "blog" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "title" varchar,
    "date" timestamp(3) with time zone,
    "excerpt" varchar,
    "cover_id" integer,
    "related_event_id" integer,
    "body" jsonb,
    "body_imported" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_blog_status" DEFAULT 'draft'
  );

  CREATE TABLE "blog_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "team_id" integer
  );

  CREATE TABLE "_blog_v_version_tags" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_blog_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_title" varchar,
    "version_date" timestamp(3) with time zone,
    "version_excerpt" varchar,
    "version_cover_id" integer,
    "version_related_event_id" integer,
    "version_body" jsonb,
    "version_body_imported" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__blog_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_blog_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "team_id" integer
  );

  CREATE TABLE "scripts_language" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" varchar PRIMARY KEY NOT NULL,
    "value" varchar
  );

  CREATE TABLE "scripts" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "title" varchar,
    "title_deva" varchar,
    "year" numeric,
    "file_id" integer,
    "synopsis" varchar,
    "body" jsonb,
    "body_imported" varchar,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_scripts_status" DEFAULT 'draft'
  );

  CREATE TABLE "scripts_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer,
    "events_id" integer
  );

  CREATE TABLE "_scripts_v_version_language" (
    "_order" integer NOT NULL,
    "_parent_id" integer NOT NULL,
    "id" serial PRIMARY KEY NOT NULL,
    "value" varchar,
    "_uuid" varchar
  );

  CREATE TABLE "_scripts_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_title" varchar,
    "version_title_deva" varchar,
    "version_year" numeric,
    "version_file_id" integer,
    "version_synopsis" varchar,
    "version_body" jsonb,
    "version_body_imported" varchar,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__scripts_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "_scripts_v_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "artists_id" integer,
    "events_id" integer
  );

  CREATE TABLE "quotes" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" varchar,
    "couplet" varchar,
    "translation" varchar,
    "attribution" varchar,
    "poet_id" integer,
    "order" numeric DEFAULT 0,
    "created_by_id" integer,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "_status" "enum_quotes_status" DEFAULT 'draft'
  );

  CREATE TABLE "_quotes_v" (
    "id" serial PRIMARY KEY NOT NULL,
    "parent_id" integer,
    "version_slug" varchar,
    "version_couplet" varchar,
    "version_translation" varchar,
    "version_attribution" varchar,
    "version_poet_id" integer,
    "version_order" numeric DEFAULT 0,
    "version_created_by_id" integer,
    "version_updated_at" timestamp(3) with time zone,
    "version_created_at" timestamp(3) with time zone,
    "version__status" "enum__quotes_v_version_status" DEFAULT 'draft',
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "latest" boolean
  );

  CREATE TABLE "payload_kv" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar NOT NULL,
    "data" jsonb NOT NULL
  );

  CREATE TABLE "payload_locked_documents" (
    "id" serial PRIMARY KEY NOT NULL,
    "global_slug" varchar,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_locked_documents_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer,
    "media_id" integer,
    "artists_id" integer,
    "songs_id" integer,
    "events_id" integer,
    "team_id" integer,
    "blog_id" integer,
    "scripts_id" integer,
    "quotes_id" integer
  );

  CREATE TABLE "payload_preferences" (
    "id" serial PRIMARY KEY NOT NULL,
    "key" varchar,
    "value" jsonb,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE TABLE "payload_preferences_rels" (
    "id" serial PRIMARY KEY NOT NULL,
    "order" integer,
    "parent_id" integer NOT NULL,
    "path" varchar NOT NULL,
    "users_id" integer
  );

  CREATE TABLE "payload_migrations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar,
    "batch" numeric,
    "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
    "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "users_sections" ADD CONSTRAINT "users_sections_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists_roles" ADD CONSTRAINT "artists_roles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "artists" ADD CONSTRAINT "artists_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artists_v_version_roles" ADD CONSTRAINT "_artists_v_version_roles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_artists_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_artists_v" ADD CONSTRAINT "_artists_v_parent_id_artists_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artists_v" ADD CONSTRAINT "_artists_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_artists_v" ADD CONSTRAINT "_artists_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "songs_language" ADD CONSTRAINT "songs_language_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs_genre" ADD CONSTRAINT "songs_genre_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs_geography" ADD CONSTRAINT "songs_geography_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs_lyrics" ADD CONSTRAINT "songs_lyrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs_references" ADD CONSTRAINT "songs_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs" ADD CONSTRAINT "songs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "songs_rels" ADD CONSTRAINT "songs_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "songs_rels" ADD CONSTRAINT "songs_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_version_language" ADD CONSTRAINT "_songs_v_version_language_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_version_genre" ADD CONSTRAINT "_songs_v_version_genre_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_version_geography" ADD CONSTRAINT "_songs_v_version_geography_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_version_lyrics" ADD CONSTRAINT "_songs_v_version_lyrics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_version_references" ADD CONSTRAINT "_songs_v_version_references_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v" ADD CONSTRAINT "_songs_v_parent_id_songs_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_songs_v" ADD CONSTRAINT "_songs_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_songs_v_rels" ADD CONSTRAINT "_songs_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_songs_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_songs_v_rels" ADD CONSTRAINT "_songs_v_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_setlist" ADD CONSTRAINT "events_setlist_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_setlist" ADD CONSTRAINT "events_setlist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_version_setlist" ADD CONSTRAINT "_events_v_version_setlist_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_version_setlist" ADD CONSTRAINT "_events_v_version_setlist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "team" ADD CONSTRAINT "team_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_team_v" ADD CONSTRAINT "_team_v_parent_id_team_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."team"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_team_v" ADD CONSTRAINT "_team_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_team_v" ADD CONSTRAINT "_team_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_tags" ADD CONSTRAINT "blog_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_cover_id_media_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_related_event_id_events_id_fk" FOREIGN KEY ("related_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog" ADD CONSTRAINT "blog_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "blog_rels" ADD CONSTRAINT "blog_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_version_tags" ADD CONSTRAINT "_blog_v_version_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_parent_id_blog_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."blog"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_cover_id_media_id_fk" FOREIGN KEY ("version_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_related_event_id_events_id_fk" FOREIGN KEY ("version_related_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v" ADD CONSTRAINT "_blog_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_blog_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_blog_v_rels" ADD CONSTRAINT "_blog_v_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scripts_language" ADD CONSTRAINT "scripts_language_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scripts" ADD CONSTRAINT "scripts_file_id_media_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scripts" ADD CONSTRAINT "scripts_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "scripts_rels" ADD CONSTRAINT "scripts_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scripts_rels" ADD CONSTRAINT "scripts_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "scripts_rels" ADD CONSTRAINT "scripts_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scripts_v_version_language" ADD CONSTRAINT "_scripts_v_version_language_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_scripts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scripts_v" ADD CONSTRAINT "_scripts_v_parent_id_scripts_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."scripts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scripts_v" ADD CONSTRAINT "_scripts_v_version_file_id_media_id_fk" FOREIGN KEY ("version_file_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scripts_v" ADD CONSTRAINT "_scripts_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_scripts_v_rels" ADD CONSTRAINT "_scripts_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_scripts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scripts_v_rels" ADD CONSTRAINT "_scripts_v_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_scripts_v_rels" ADD CONSTRAINT "_scripts_v_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_poet_id_artists_id_fk" FOREIGN KEY ("poet_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quotes_v" ADD CONSTRAINT "_quotes_v_parent_id_quotes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."quotes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quotes_v" ADD CONSTRAINT "_quotes_v_version_poet_id_artists_id_fk" FOREIGN KEY ("version_poet_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_quotes_v" ADD CONSTRAINT "_quotes_v_version_created_by_id_users_id_fk" FOREIGN KEY ("version_created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_artists_fk" FOREIGN KEY ("artists_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_songs_fk" FOREIGN KEY ("songs_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_team_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_fk" FOREIGN KEY ("blog_id") REFERENCES "public"."blog"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_scripts_fk" FOREIGN KEY ("scripts_id") REFERENCES "public"."scripts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quotes_fk" FOREIGN KEY ("quotes_id") REFERENCES "public"."quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sections_order_idx" ON "users_sections" USING btree ("order");
  CREATE INDEX "users_sections_parent_idx" ON "users_sections" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "artists_roles_order_idx" ON "artists_roles" USING btree ("_order");
  CREATE INDEX "artists_roles_parent_id_idx" ON "artists_roles" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "artists_slug_idx" ON "artists" USING btree ("slug");
  CREATE INDEX "artists_photo_idx" ON "artists" USING btree ("photo_id");
  CREATE INDEX "artists_created_by_idx" ON "artists" USING btree ("created_by_id");
  CREATE INDEX "artists_updated_at_idx" ON "artists" USING btree ("updated_at");
  CREATE INDEX "artists_created_at_idx" ON "artists" USING btree ("created_at");
  CREATE INDEX "artists__status_idx" ON "artists" USING btree ("_status");
  CREATE INDEX "_artists_v_version_roles_order_idx" ON "_artists_v_version_roles" USING btree ("_order");
  CREATE INDEX "_artists_v_version_roles_parent_id_idx" ON "_artists_v_version_roles" USING btree ("_parent_id");
  CREATE INDEX "_artists_v_parent_idx" ON "_artists_v" USING btree ("parent_id");
  CREATE INDEX "_artists_v_version_version_slug_idx" ON "_artists_v" USING btree ("version_slug");
  CREATE INDEX "_artists_v_version_version_photo_idx" ON "_artists_v" USING btree ("version_photo_id");
  CREATE INDEX "_artists_v_version_version_created_by_idx" ON "_artists_v" USING btree ("version_created_by_id");
  CREATE INDEX "_artists_v_version_version_updated_at_idx" ON "_artists_v" USING btree ("version_updated_at");
  CREATE INDEX "_artists_v_version_version_created_at_idx" ON "_artists_v" USING btree ("version_created_at");
  CREATE INDEX "_artists_v_version_version__status_idx" ON "_artists_v" USING btree ("version__status");
  CREATE INDEX "_artists_v_created_at_idx" ON "_artists_v" USING btree ("created_at");
  CREATE INDEX "_artists_v_updated_at_idx" ON "_artists_v" USING btree ("updated_at");
  CREATE INDEX "_artists_v_latest_idx" ON "_artists_v" USING btree ("latest");
  CREATE INDEX "songs_language_order_idx" ON "songs_language" USING btree ("_order");
  CREATE INDEX "songs_language_parent_id_idx" ON "songs_language" USING btree ("_parent_id");
  CREATE INDEX "songs_genre_order_idx" ON "songs_genre" USING btree ("_order");
  CREATE INDEX "songs_genre_parent_id_idx" ON "songs_genre" USING btree ("_parent_id");
  CREATE INDEX "songs_geography_order_idx" ON "songs_geography" USING btree ("_order");
  CREATE INDEX "songs_geography_parent_id_idx" ON "songs_geography" USING btree ("_parent_id");
  CREATE INDEX "songs_lyrics_order_idx" ON "songs_lyrics" USING btree ("_order");
  CREATE INDEX "songs_lyrics_parent_id_idx" ON "songs_lyrics" USING btree ("_parent_id");
  CREATE INDEX "songs_references_order_idx" ON "songs_references" USING btree ("_order");
  CREATE INDEX "songs_references_parent_id_idx" ON "songs_references" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "songs_slug_idx" ON "songs" USING btree ("slug");
  CREATE INDEX "songs_created_by_idx" ON "songs" USING btree ("created_by_id");
  CREATE INDEX "songs_updated_at_idx" ON "songs" USING btree ("updated_at");
  CREATE INDEX "songs_created_at_idx" ON "songs" USING btree ("created_at");
  CREATE INDEX "songs__status_idx" ON "songs" USING btree ("_status");
  CREATE INDEX "songs_rels_order_idx" ON "songs_rels" USING btree ("order");
  CREATE INDEX "songs_rels_parent_idx" ON "songs_rels" USING btree ("parent_id");
  CREATE INDEX "songs_rels_path_idx" ON "songs_rels" USING btree ("path");
  CREATE INDEX "songs_rels_artists_id_idx" ON "songs_rels" USING btree ("artists_id");
  CREATE INDEX "_songs_v_version_language_order_idx" ON "_songs_v_version_language" USING btree ("_order");
  CREATE INDEX "_songs_v_version_language_parent_id_idx" ON "_songs_v_version_language" USING btree ("_parent_id");
  CREATE INDEX "_songs_v_version_genre_order_idx" ON "_songs_v_version_genre" USING btree ("_order");
  CREATE INDEX "_songs_v_version_genre_parent_id_idx" ON "_songs_v_version_genre" USING btree ("_parent_id");
  CREATE INDEX "_songs_v_version_geography_order_idx" ON "_songs_v_version_geography" USING btree ("_order");
  CREATE INDEX "_songs_v_version_geography_parent_id_idx" ON "_songs_v_version_geography" USING btree ("_parent_id");
  CREATE INDEX "_songs_v_version_lyrics_order_idx" ON "_songs_v_version_lyrics" USING btree ("_order");
  CREATE INDEX "_songs_v_version_lyrics_parent_id_idx" ON "_songs_v_version_lyrics" USING btree ("_parent_id");
  CREATE INDEX "_songs_v_version_references_order_idx" ON "_songs_v_version_references" USING btree ("_order");
  CREATE INDEX "_songs_v_version_references_parent_id_idx" ON "_songs_v_version_references" USING btree ("_parent_id");
  CREATE INDEX "_songs_v_parent_idx" ON "_songs_v" USING btree ("parent_id");
  CREATE INDEX "_songs_v_version_version_slug_idx" ON "_songs_v" USING btree ("version_slug");
  CREATE INDEX "_songs_v_version_version_created_by_idx" ON "_songs_v" USING btree ("version_created_by_id");
  CREATE INDEX "_songs_v_version_version_updated_at_idx" ON "_songs_v" USING btree ("version_updated_at");
  CREATE INDEX "_songs_v_version_version_created_at_idx" ON "_songs_v" USING btree ("version_created_at");
  CREATE INDEX "_songs_v_version_version__status_idx" ON "_songs_v" USING btree ("version__status");
  CREATE INDEX "_songs_v_created_at_idx" ON "_songs_v" USING btree ("created_at");
  CREATE INDEX "_songs_v_updated_at_idx" ON "_songs_v" USING btree ("updated_at");
  CREATE INDEX "_songs_v_latest_idx" ON "_songs_v" USING btree ("latest");
  CREATE INDEX "_songs_v_rels_order_idx" ON "_songs_v_rels" USING btree ("order");
  CREATE INDEX "_songs_v_rels_parent_idx" ON "_songs_v_rels" USING btree ("parent_id");
  CREATE INDEX "_songs_v_rels_path_idx" ON "_songs_v_rels" USING btree ("path");
  CREATE INDEX "_songs_v_rels_artists_id_idx" ON "_songs_v_rels" USING btree ("artists_id");
  CREATE INDEX "events_setlist_order_idx" ON "events_setlist" USING btree ("_order");
  CREATE INDEX "events_setlist_parent_id_idx" ON "events_setlist" USING btree ("_parent_id");
  CREATE INDEX "events_setlist_song_idx" ON "events_setlist" USING btree ("song_id");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_cover_idx" ON "events" USING btree ("cover_id");
  CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_artists_id_idx" ON "events_rels" USING btree ("artists_id");
  CREATE INDEX "_events_v_version_setlist_order_idx" ON "_events_v_version_setlist" USING btree ("_order");
  CREATE INDEX "_events_v_version_setlist_parent_id_idx" ON "_events_v_version_setlist" USING btree ("_parent_id");
  CREATE INDEX "_events_v_version_setlist_song_idx" ON "_events_v_version_setlist" USING btree ("song_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_cover_idx" ON "_events_v" USING btree ("version_cover_id");
  CREATE INDEX "_events_v_version_version_created_by_idx" ON "_events_v" USING btree ("version_created_by_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_rels_order_idx" ON "_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_artists_id_idx" ON "_events_v_rels" USING btree ("artists_id");
  CREATE UNIQUE INDEX "team_slug_idx" ON "team" USING btree ("slug");
  CREATE INDEX "team_photo_idx" ON "team" USING btree ("photo_id");
  CREATE INDEX "team_created_by_idx" ON "team" USING btree ("created_by_id");
  CREATE INDEX "team_updated_at_idx" ON "team" USING btree ("updated_at");
  CREATE INDEX "team_created_at_idx" ON "team" USING btree ("created_at");
  CREATE INDEX "team__status_idx" ON "team" USING btree ("_status");
  CREATE INDEX "_team_v_parent_idx" ON "_team_v" USING btree ("parent_id");
  CREATE INDEX "_team_v_version_version_slug_idx" ON "_team_v" USING btree ("version_slug");
  CREATE INDEX "_team_v_version_version_photo_idx" ON "_team_v" USING btree ("version_photo_id");
  CREATE INDEX "_team_v_version_version_created_by_idx" ON "_team_v" USING btree ("version_created_by_id");
  CREATE INDEX "_team_v_version_version_updated_at_idx" ON "_team_v" USING btree ("version_updated_at");
  CREATE INDEX "_team_v_version_version_created_at_idx" ON "_team_v" USING btree ("version_created_at");
  CREATE INDEX "_team_v_version_version__status_idx" ON "_team_v" USING btree ("version__status");
  CREATE INDEX "_team_v_created_at_idx" ON "_team_v" USING btree ("created_at");
  CREATE INDEX "_team_v_updated_at_idx" ON "_team_v" USING btree ("updated_at");
  CREATE INDEX "_team_v_latest_idx" ON "_team_v" USING btree ("latest");
  CREATE INDEX "blog_tags_order_idx" ON "blog_tags" USING btree ("_order");
  CREATE INDEX "blog_tags_parent_id_idx" ON "blog_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "blog_slug_idx" ON "blog" USING btree ("slug");
  CREATE INDEX "blog_cover_idx" ON "blog" USING btree ("cover_id");
  CREATE INDEX "blog_related_event_idx" ON "blog" USING btree ("related_event_id");
  CREATE INDEX "blog_created_by_idx" ON "blog" USING btree ("created_by_id");
  CREATE INDEX "blog_updated_at_idx" ON "blog" USING btree ("updated_at");
  CREATE INDEX "blog_created_at_idx" ON "blog" USING btree ("created_at");
  CREATE INDEX "blog__status_idx" ON "blog" USING btree ("_status");
  CREATE INDEX "blog_rels_order_idx" ON "blog_rels" USING btree ("order");
  CREATE INDEX "blog_rels_parent_idx" ON "blog_rels" USING btree ("parent_id");
  CREATE INDEX "blog_rels_path_idx" ON "blog_rels" USING btree ("path");
  CREATE INDEX "blog_rels_team_id_idx" ON "blog_rels" USING btree ("team_id");
  CREATE INDEX "_blog_v_version_tags_order_idx" ON "_blog_v_version_tags" USING btree ("_order");
  CREATE INDEX "_blog_v_version_tags_parent_id_idx" ON "_blog_v_version_tags" USING btree ("_parent_id");
  CREATE INDEX "_blog_v_parent_idx" ON "_blog_v" USING btree ("parent_id");
  CREATE INDEX "_blog_v_version_version_slug_idx" ON "_blog_v" USING btree ("version_slug");
  CREATE INDEX "_blog_v_version_version_cover_idx" ON "_blog_v" USING btree ("version_cover_id");
  CREATE INDEX "_blog_v_version_version_related_event_idx" ON "_blog_v" USING btree ("version_related_event_id");
  CREATE INDEX "_blog_v_version_version_created_by_idx" ON "_blog_v" USING btree ("version_created_by_id");
  CREATE INDEX "_blog_v_version_version_updated_at_idx" ON "_blog_v" USING btree ("version_updated_at");
  CREATE INDEX "_blog_v_version_version_created_at_idx" ON "_blog_v" USING btree ("version_created_at");
  CREATE INDEX "_blog_v_version_version__status_idx" ON "_blog_v" USING btree ("version__status");
  CREATE INDEX "_blog_v_created_at_idx" ON "_blog_v" USING btree ("created_at");
  CREATE INDEX "_blog_v_updated_at_idx" ON "_blog_v" USING btree ("updated_at");
  CREATE INDEX "_blog_v_latest_idx" ON "_blog_v" USING btree ("latest");
  CREATE INDEX "_blog_v_rels_order_idx" ON "_blog_v_rels" USING btree ("order");
  CREATE INDEX "_blog_v_rels_parent_idx" ON "_blog_v_rels" USING btree ("parent_id");
  CREATE INDEX "_blog_v_rels_path_idx" ON "_blog_v_rels" USING btree ("path");
  CREATE INDEX "_blog_v_rels_team_id_idx" ON "_blog_v_rels" USING btree ("team_id");
  CREATE INDEX "scripts_language_order_idx" ON "scripts_language" USING btree ("_order");
  CREATE INDEX "scripts_language_parent_id_idx" ON "scripts_language" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "scripts_slug_idx" ON "scripts" USING btree ("slug");
  CREATE INDEX "scripts_file_idx" ON "scripts" USING btree ("file_id");
  CREATE INDEX "scripts_created_by_idx" ON "scripts" USING btree ("created_by_id");
  CREATE INDEX "scripts_updated_at_idx" ON "scripts" USING btree ("updated_at");
  CREATE INDEX "scripts_created_at_idx" ON "scripts" USING btree ("created_at");
  CREATE INDEX "scripts__status_idx" ON "scripts" USING btree ("_status");
  CREATE INDEX "scripts_rels_order_idx" ON "scripts_rels" USING btree ("order");
  CREATE INDEX "scripts_rels_parent_idx" ON "scripts_rels" USING btree ("parent_id");
  CREATE INDEX "scripts_rels_path_idx" ON "scripts_rels" USING btree ("path");
  CREATE INDEX "scripts_rels_artists_id_idx" ON "scripts_rels" USING btree ("artists_id");
  CREATE INDEX "scripts_rels_events_id_idx" ON "scripts_rels" USING btree ("events_id");
  CREATE INDEX "_scripts_v_version_language_order_idx" ON "_scripts_v_version_language" USING btree ("_order");
  CREATE INDEX "_scripts_v_version_language_parent_id_idx" ON "_scripts_v_version_language" USING btree ("_parent_id");
  CREATE INDEX "_scripts_v_parent_idx" ON "_scripts_v" USING btree ("parent_id");
  CREATE INDEX "_scripts_v_version_version_slug_idx" ON "_scripts_v" USING btree ("version_slug");
  CREATE INDEX "_scripts_v_version_version_file_idx" ON "_scripts_v" USING btree ("version_file_id");
  CREATE INDEX "_scripts_v_version_version_created_by_idx" ON "_scripts_v" USING btree ("version_created_by_id");
  CREATE INDEX "_scripts_v_version_version_updated_at_idx" ON "_scripts_v" USING btree ("version_updated_at");
  CREATE INDEX "_scripts_v_version_version_created_at_idx" ON "_scripts_v" USING btree ("version_created_at");
  CREATE INDEX "_scripts_v_version_version__status_idx" ON "_scripts_v" USING btree ("version__status");
  CREATE INDEX "_scripts_v_created_at_idx" ON "_scripts_v" USING btree ("created_at");
  CREATE INDEX "_scripts_v_updated_at_idx" ON "_scripts_v" USING btree ("updated_at");
  CREATE INDEX "_scripts_v_latest_idx" ON "_scripts_v" USING btree ("latest");
  CREATE INDEX "_scripts_v_rels_order_idx" ON "_scripts_v_rels" USING btree ("order");
  CREATE INDEX "_scripts_v_rels_parent_idx" ON "_scripts_v_rels" USING btree ("parent_id");
  CREATE INDEX "_scripts_v_rels_path_idx" ON "_scripts_v_rels" USING btree ("path");
  CREATE INDEX "_scripts_v_rels_artists_id_idx" ON "_scripts_v_rels" USING btree ("artists_id");
  CREATE INDEX "_scripts_v_rels_events_id_idx" ON "_scripts_v_rels" USING btree ("events_id");
  CREATE UNIQUE INDEX "quotes_slug_idx" ON "quotes" USING btree ("slug");
  CREATE INDEX "quotes_poet_idx" ON "quotes" USING btree ("poet_id");
  CREATE INDEX "quotes_created_by_idx" ON "quotes" USING btree ("created_by_id");
  CREATE INDEX "quotes_updated_at_idx" ON "quotes" USING btree ("updated_at");
  CREATE INDEX "quotes_created_at_idx" ON "quotes" USING btree ("created_at");
  CREATE INDEX "quotes__status_idx" ON "quotes" USING btree ("_status");
  CREATE INDEX "_quotes_v_parent_idx" ON "_quotes_v" USING btree ("parent_id");
  CREATE INDEX "_quotes_v_version_version_slug_idx" ON "_quotes_v" USING btree ("version_slug");
  CREATE INDEX "_quotes_v_version_version_poet_idx" ON "_quotes_v" USING btree ("version_poet_id");
  CREATE INDEX "_quotes_v_version_version_created_by_idx" ON "_quotes_v" USING btree ("version_created_by_id");
  CREATE INDEX "_quotes_v_version_version_updated_at_idx" ON "_quotes_v" USING btree ("version_updated_at");
  CREATE INDEX "_quotes_v_version_version_created_at_idx" ON "_quotes_v" USING btree ("version_created_at");
  CREATE INDEX "_quotes_v_version_version__status_idx" ON "_quotes_v" USING btree ("version__status");
  CREATE INDEX "_quotes_v_created_at_idx" ON "_quotes_v" USING btree ("created_at");
  CREATE INDEX "_quotes_v_updated_at_idx" ON "_quotes_v" USING btree ("updated_at");
  CREATE INDEX "_quotes_v_latest_idx" ON "_quotes_v" USING btree ("latest");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_artists_id_idx" ON "payload_locked_documents_rels" USING btree ("artists_id");
  CREATE INDEX "payload_locked_documents_rels_songs_id_idx" ON "payload_locked_documents_rels" USING btree ("songs_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_team_id_idx" ON "payload_locked_documents_rels" USING btree ("team_id");
  CREATE INDEX "payload_locked_documents_rels_blog_id_idx" ON "payload_locked_documents_rels" USING btree ("blog_id");
  CREATE INDEX "payload_locked_documents_rels_scripts_id_idx" ON "payload_locked_documents_rels" USING btree ("scripts_id");
  CREATE INDEX "payload_locked_documents_rels_quotes_id_idx" ON "payload_locked_documents_rels" USING btree ("quotes_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sections" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "artists_roles" CASCADE;
  DROP TABLE "artists" CASCADE;
  DROP TABLE "_artists_v_version_roles" CASCADE;
  DROP TABLE "_artists_v" CASCADE;
  DROP TABLE "songs_language" CASCADE;
  DROP TABLE "songs_genre" CASCADE;
  DROP TABLE "songs_geography" CASCADE;
  DROP TABLE "songs_lyrics" CASCADE;
  DROP TABLE "songs_references" CASCADE;
  DROP TABLE "songs" CASCADE;
  DROP TABLE "songs_rels" CASCADE;
  DROP TABLE "_songs_v_version_language" CASCADE;
  DROP TABLE "_songs_v_version_genre" CASCADE;
  DROP TABLE "_songs_v_version_geography" CASCADE;
  DROP TABLE "_songs_v_version_lyrics" CASCADE;
  DROP TABLE "_songs_v_version_references" CASCADE;
  DROP TABLE "_songs_v" CASCADE;
  DROP TABLE "_songs_v_rels" CASCADE;
  DROP TABLE "events_setlist" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "_events_v_version_setlist" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_rels" CASCADE;
  DROP TABLE "team" CASCADE;
  DROP TABLE "_team_v" CASCADE;
  DROP TABLE "blog_tags" CASCADE;
  DROP TABLE "blog" CASCADE;
  DROP TABLE "blog_rels" CASCADE;
  DROP TABLE "_blog_v_version_tags" CASCADE;
  DROP TABLE "_blog_v" CASCADE;
  DROP TABLE "_blog_v_rels" CASCADE;
  DROP TABLE "scripts_language" CASCADE;
  DROP TABLE "scripts" CASCADE;
  DROP TABLE "scripts_rels" CASCADE;
  DROP TABLE "_scripts_v_version_language" CASCADE;
  DROP TABLE "_scripts_v" CASCADE;
  DROP TABLE "_scripts_v_rels" CASCADE;
  DROP TABLE "quotes" CASCADE;
  DROP TABLE "_quotes_v" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_sections";
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_artists_status";
  DROP TYPE "public"."enum__artists_v_version_status";
  DROP TYPE "public"."enum_songs_status";
  DROP TYPE "public"."enum__songs_v_version_status";
  DROP TYPE "public"."enum_events_series";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_series";
  DROP TYPE "public"."enum__events_v_version_status";
  DROP TYPE "public"."enum_team_status";
  DROP TYPE "public"."enum__team_v_version_status";
  DROP TYPE "public"."enum_blog_status";
  DROP TYPE "public"."enum__blog_v_version_status";
  DROP TYPE "public"."enum_scripts_status";
  DROP TYPE "public"."enum__scripts_v_version_status";
  DROP TYPE "public"."enum_quotes_status";
  DROP TYPE "public"."enum__quotes_v_version_status";`)
}
