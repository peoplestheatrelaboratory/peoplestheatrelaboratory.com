# PTL content administration

The public site remains Astro. Payload runs separately at `/admin` in the
`admin/` Next.js workspace. PostgreSQL stores content, accounts, permissions,
drafts and up to 15 versions per document. R2 stores uploaded files.

## Provisioned resources

- Neon organisation: `peoplestheatrelaboratory` (`org-royal-thunder-14335552`).
- Project: `ptl` (`divine-butterfly-22412170`), Singapore, PostgreSQL 17.
- Development branch: `admin-development` (`br-tiny-scene-aohavk92`). The main
  database branch has not been migrated or populated.
- Cloudflare account: `peoplestheatrelaboratory` (`7fbdda18411017dc0ab61988f2bdd6e7`).
- Private R2 Standard bucket: `ptl-media`, APAC location hint.
- Account-owned token: `PTL admin - ptl-media only`, bucket object read/write.
  It cannot manage other buckets or the Cloudflare account.
- Local credentials are in ignored `admin/.env`. Initial super-admin login is
  in ignored `admin/.initial-admin.txt`; change the password after first login.

## Local development

Use Node 24 and Bun. Install dependencies with `bun install` at the repo root.
Copy `.env.example` to `.env.local` and `admin/.env.example` to `admin/.env`
when setting up a new checkout; do not overwrite populated environment files.
Run `bun run admin:dev` and `bun run dev` in separate terminals.

`DATABASE_URL` is the pooled Neon URL. `DATABASE_DIRECT_URL` is the direct URL
for migrations. Use `sslmode=verify-full`. Set a random `PAYLOAD_SECRET` and
the same random `ISR_BYPASS_TOKEN` in both applications. `ADMIN_URL` and
`CMS_URL` identify the admin origin; `SITE_URL` identifies the public site.

From `admin/`, run `DATABASE_MIGRATING=1 bun run db:migrate` to apply reviewed
migrations. Automatic schema pushing is disabled. On an empty database only,
set `BOOTSTRAP_EMAIL` and a random `BOOTSTRAP_PASSWORD` of at least 16 characters,
then run `bun run bootstrap` and remove those bootstrap variables.

## Roles

| Role | Permissions |
| --- | --- |
| Super admin | Manage accounts, permissions, all content, publication and media visibility. |
| Editor | Edit assigned sections; publish/delete only when `canPublish` is enabled. |
| Contributor | Create and edit their own drafts in assigned sections; cannot publish. |

Sections: events, library, blog, team and quotes. Staff can upload private media;
only super admins can modify, release or delete it. Disabled accounts cannot
sign in or administer content. Anonymous signup is blocked, including Payload's
first-user registration endpoint. SMTP is optional: until configured, email
delivery and password-reset emails are explicitly disabled. A super admin can
set user passwords directly.

## Public content and caching

`GET /api/site-content` exposes an allowlisted, sanitized projection of published
content and public media. Drafts, account details and private uploads are omitted.
Next's data cache reuses the snapshot for one hour to reduce database wakeups.
After a content publication/deletion or media change commits, the snapshot cache
is expired and the admin calls Astro's authenticated revalidation endpoint.
Astro caches public pages for five minutes, with explicit refresh on publication.
Date-dependent views use the India timezone on each render.

If the refresh webhook fails after snapshot invalidation, the next timed page
refresh picks up the change. If snapshot invalidation itself fails, the one-hour
snapshot expiry is the fallback. An unavailable CMS fails the refresh instead
of silently restoring potentially deleted content from the old snapshot.
Without `CMS_URL`, the Astro site uses the committed JSON snapshot for development.

## Conservative storage limits

R2 Standard currently includes 10 GB-month, 1 million Class A and 10 million
Class B operations each month. See [Cloudflare pricing](https://developers.cloudflare.com/r2/pricing/).
This app stops well below those allowances:

- 3 MB maximum file size; JPEG, PNG, WebP and PDF only.
- 5 GB cumulative upload bytes, including replacements and failed uploads.
- 100,000 write/list requests and 1,000,000 read requests per UTC month.
- No automatic image variants, direct browser uploads, public R2 endpoint or SDK retries.

Each R2 request reserves its budget atomically in PostgreSQL before reaching R2.
When the database or budget check fails, storage requests stop. Deleting a file
does not refund the lifetime budget; it must only be increased after reviewing
actual account usage. Do not reset or delete the ledger to bypass a limit.

These limits cover this application's requests using this database. Dashboard
uploads, other applications and database branches have separate activity. Keep
this bucket dedicated to this database; do not attach it to multiple independent
quota ledgers. They are not an account-level billing cap. Neon remains on its
free plan, uses small compute and autosuspends; public snapshot caching reduces
wakeups. Heavy admin activity or other projects can still consume the free quota.

## Import and launch

The committed published Notion snapshot has been imported: 27 artists, 45 songs,
4 events, 6 team members and 9 quotes (91 records). Blog and scripts are empty.
Notion drafts and changes newer than that export are not included.

`bun run import:snapshot` preserves existing slugs and imports missing records.
The `--resume-drafts` option is only for recovering an interrupted initial import
before editors start work. It must not be used to overwrite editorial drafts.
The importer rejects nonempty media URLs pending an explicit media migration.

Create separate Vercel projects for the root Astro site and `admin/` (Next.js
preset, root directory `admin`). Configure secrets separately in each project;
do not commit `.env` files. Both projects use the Singapore function region.
Migration/bootstrap scripts are manual and must not be build commands.
Protected previews need an automation-bypass configuration for server-to-server
CMS and revalidation requests before testing cross-project publication.

Before production cutover, reconcile current Notion changes, choose the production
database/bucket pairing, configure stable admin/site origins and SMTP if needed,
and verify login, publication, file access and cache refresh on deployed URLs.
The existing live site has not been switched to this backend. Keep its previous
deployment for rollback; rolling back frontend code does not roll back DB writes.

## Verification

Run `bun test tests`, `bun run check`, `bun run admin:check`, `bun run build`
and `bun run admin:build`. From `admin/`, `bun run verify:access` exercises real
database permissions with temporary records, and
`bun run scripts/verify-storage-budget.ts` checks concurrent quota enforcement
without any R2 traffic. Both remove their test records.

Verified on 2026-11-10: both production builds and type checks pass; seven unit
tests pass; real database role checks and concurrent budget reservations pass.
HTTP checks covered login, anonymous user denial, public pages and missing-page
404s. A draft/publish/delete cycle refreshed the shared snapshot and Astro HTML.
Every imported field matches the committed source snapshot. R2 upload, private
access denial, authenticated download, public release and deletion passed using
a 90-byte PNG (2 write/delete and 4 read requests); no test media remains.
Deployed ISR behavior is still a launch verification step.

The existing Cloudflare MCP login was extended with `account-api-tokens.write`
after the API reported that missing scope. Existing scopes were retained. R2
credentials were generated through MCP and saved directly to the ignored
environment file. Temporary credential files were removed after verification.
