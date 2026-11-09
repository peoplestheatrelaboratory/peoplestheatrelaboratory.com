# AGENTS.md

Working notes for anyone, human or agent, changing this repository. Read this
first. Deeper background is in [docs/admin.md](docs/admin.md).

## What this is

The website of Peoples Theatre Laboratory (PTL), a theatre collective in
Vadodara that hosts a monthly gathering called Baithak and an annual one called
Kabir Sang Ruhdaari (KSR). The site lists events, keeps the lyrics of every
song sung at them, and introduces the people.

The owner's rule for the home page: it is not a typical landing page. It is one
screen of video with a couplet, then the next gathering.

## Two applications, one repository

| | Public site | Admin |
| --- | --- | --- |
| Directory | repo root (`src/`, `api/`, `public/`) | `admin/` (Bun workspace) |
| Framework | Astro 7, server output, Vercel ISR | Payload CMS 3 on Next.js 16 |
| Vercel project | `peoplestheatrelaboratory-com` | `ptl-admin` (root directory `admin`) |
| URL | https://main.peoplestheatrelaboratory.com (new site), https://peoplestheatrelaboratory.com (apex, still the old deployment) | https://admin.peoplestheatrelaboratory.com/admin |
| Data | none of its own | Neon Postgres 17, Cloudflare R2 bucket `ptl-media` |

`shared/` holds the contract between them: Zod schemas and types that both
sides import. Change a shape there and both builds see it.

Both Vercel projects are connected to this GitHub repository and deploy from
`main`, in the Singapore region (`sin1`), on Node 24.

## How content reaches a visitor

1. Staff edit in the admin. Content collections have drafts and 15 versions.
2. The admin exposes two public, read-only, allowlisted feeds:
   - `GET /api/site-content`: all published content plus public media metadata
     (`admin/src/lib/site-content.ts`). Cached one hour, tag `ptl-public-content`.
   - `GET /api/site-settings`: homepage, footer and video settings
     (`admin/src/app/(payload)/api/site-settings/route.ts`). Cached 30 days,
     tag `ptl-site-settings`.
3. Every Astro page calls `getContent(Astro.locals)` and, where needed,
   `getSiteSettings(Astro.locals)` (`src/lib/`). Each fetches its feed once per
   request and validates it against the schema in `shared/`.
4. Vercel caches each rendered page for five minutes (ISR).
5. On publish, unpublish, delete, media change or settings save, the admin
   expires its cache tag and POSTs to the site's `api/revalidate.ts`, which
   re-renders every published path straight away.

Without `CMS_URL` the site renders from the committed JSON snapshot in
`content/site/` and the defaults in `shared/site-settings.ts`. That mode is for
local development only.

## Commands

Package manager is Bun (`bun@1.3.14`). Run from the repo root.

```sh
bun install
bun run dev            # public site, http://localhost:4321
bun run admin:dev      # admin, http://localhost:3001
bun test tests         # unit tests
bun run check          # astro check (types + templates)
bun run admin:check    # tsc for the admin
bun run build          # public site production build
bun run admin:build    # admin production build
```

From `admin/`:

```sh
bun run generate                              # regenerate payload-types.ts and the import map after changing fields
bun run db:create-migration <name>            # write a migration after changing fields
DATABASE_MIGRATING=1 bun run db:migrate       # apply migrations (uses the direct URL)
bun run verify:access                         # role checks against the real database, with temporary records
```

Before you call a change done, run `bun test tests`, `bun run check` and
`bun run admin:check`. CI (`.github/workflows/ci.yml`) runs the same three.

## Environment variables

Never commit `.env` files. Templates are `.env.example` and `admin/.env.example`.

| Variable | Site | Admin | Purpose |
| --- | --- | --- | --- |
| `CMS_URL` | yes | | Admin origin the site reads content from |
| `SITE_URL` | yes | yes | Public site origin; the admin posts revalidation there |
| `ADMIN_URL` | | yes | Admin origin; used for media URLs, CORS and CSRF |
| `ISR_BYPASS_TOKEN` | yes | yes | Shared secret. Must be identical in both projects, and present at build time for the site |
| `DATABASE_URL` | | yes | Pooled Neon URL, `sslmode=verify-full` |
| `DATABASE_DIRECT_URL` | | yes | Direct Neon URL, used only for migrations |
| `PAYLOAD_SECRET` | | yes | Payload signing secret |
| `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | | yes | Upload storage. Uploads are refused in production if any is missing |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | | optional | Password-reset email. Not configured yet |
| `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD` | | one-off | First super admin on an empty database only |
| `NOTION_TOKEN` | optional | | Only for `bun run pull`, the Notion export |

Local values live in the ignored files `.env.local` and `admin/.env`.

## Provisioned resources

- **Neon**: organisation `peoplestheatrelaboratory`, project `ptl`, Singapore.
  The live data is on the branch named `admin-development`. Treat it as
  production despite the name. The `main` database branch is empty.
- **Cloudflare**: account `peoplestheatrelaboratory`, private R2 bucket
  `ptl-media`. The app's token can only read and write objects in that bucket.
- **Vercel**: both projects are under Yash Chauhan's personal scope.
- **GitHub**: `peoplestheatrelaboratory/peoplestheatrelaboratory.com`. The
  repository is **public**. Nothing secret, and no personal data, goes in
  commits, issues or workflow artifacts.

## Roles and access

Defined in `admin/src/lib/permissions.ts`, tested in `tests/permissions.test.ts`.

| Role | Can do |
| --- | --- |
| Super admin | Everything: accounts, all content, publishing, settings, media visibility |
| Editor | Edit assigned sections. Publish and delete only with `canPublish` |
| Contributor | Create and edit their own drafts in assigned sections. Never publishes |

- Sections: `events`, `library` (songs, artists, scripts), `blog`, `team`, `quotes`.
- Anyone without publish rights may delete drafts they created, nothing else.
- The collection REST API is closed to anonymous readers. Signed-in staff see
  published content everywhere and drafts only in their sections.
- The public site must never call the collection API. It uses the two feeds
  above, which run with access checks overridden and filter to published rows
  themselves. If you add a field to a collection, it is not public until you
  add it to the projection in `site-content.ts` and to `shared/content-schema.ts`.
- Uploads are private until a super admin ticks "Make available to everyone".
- Anonymous signup is blocked, including Payload's first-user route.

## Conventions

- **Trailing slashes.** Every page URL ends in `/`. Links, redirects and
  revalidation paths must include it.
- **Slugs** match `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The schema, the admin
  validator and the revalidation endpoint all enforce this.
- **Dates** are `YYYY-MM-DD` strings. "Today" is computed in `Asia/Kolkata` on
  each render, so an event becomes "past" at midnight in India.
- **Scripts and language.** Text may be Devanagari, Gujarati or Latin. Use
  `textLang()` for the `lang` attribute and `scriptClass()` for the font class
  (`src/lib/content.ts`). Do not hardcode `lang="hi"` on content that comes
  from the CMS.
- **Images from the CMS.** Write `<img src={url} {...imageAttrs(url)} />`. That
  supplies the uploader's alt text and the intrinsic width and height.
- **HTML from the CMS** is sanitized in `site-content.ts` to a small tag
  allowlist before it leaves the admin. Only that output may go through
  `set:html`. Lyrics are plain text and are escaped in `SongSheet.astro`.
- **Settings versus source.** Homepage copy, video, phone number, button
  labels and footer links come from `getSiteSettings`. Do not read
  `SITE.phone` in pages; `src/consts.ts` is for fixed metadata and navigation.
- **Styling.** Design tokens are in `src/styles/tokens.css`. Component styles
  are scoped `<style>` blocks. All CSS is inlined at build.
- **Fonts** are self-hosted through Astro's font provider in `astro.config.mjs`.
- **TypeScript is pinned to 6.0.3.** `astro check` does not work with TS 7.

## Changing the content model

1. Edit the collection in `admin/src/collections/content.ts` (or the global in
   `admin/src/globals/SiteSettings.ts`).
2. In `admin/`: `bun run generate`, then `bun run db:create-migration <name>`.
   Review the generated SQL. Schema push is disabled on purpose.
3. Add the field to the projection (`site-content.ts`), the schema
   (`shared/content-schema.ts`) and the type (`shared/content-types.ts`).
   New schema fields need a `.default()` so the committed snapshot and any
   cached older feed still parse.
4. Bump the cache key string in `api/site-content/route.ts`
   (`ptl-public-content-vN`) so an older cached payload cannot hide the field.
5. Test the migration on a throwaway Neon branch, then apply it to the live
   branch before the code that needs it deploys. Keep migrations additive.

## Deploying

- Pushing to `main` deploys both projects. Do not deploy from an uncommitted
  working tree with the CLI: the next push would silently roll the code back
  while the database keeps the newer schema.
- Migrations and bootstrap are manual steps. They are never build commands.
- Rolling back code does not roll back database writes.
- Response headers for both projects are set in `vercel.json` and
  `admin/vercel.json`.
- `api/` at the repo root holds plain Vercel functions. That namespace takes
  precedence over Astro's own `/api` routes in the deployed project, which is
  why `api/revalidate.ts` lives there and not under `src/pages/api/`.

## Backups and restore

`.github/workflows/backup.yml` dumps the live database every night at 02:00
IST, encrypts it with GPG (AES-256) and keeps it as a workflow artifact for 30
days. It skips itself, with a warning, until two repository secrets exist:

- `BACKUP_DATABASE_URL`: the direct Neon connection string
- `BACKUP_PASSPHRASE`: a long random passphrase, also stored somewhere safe

GitHub pauses scheduled workflows after 60 days without repository activity.
Check the Actions tab occasionally.

To restore, download the artifact, then:

```sh
gpg --decrypt --output ptl.dump ptl-YYYY-MM-DD.dump.gpg
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DATABASE_URL" ptl.dump
```

Restore into a new Neon branch first and check it before pointing the admin at it.
R2 files are not in this backup.

## Things that will bite you

- **The live database branch is called `admin-development`.** Do not reset it,
  and do not run destructive checks against it.
- **The storage budget ledger** (`ptl_storage_budget`, see
  `admin/src/lib/storage-budget.ts`) counts every R2 request and never
  refunds. Do not reset it to get past a limit.
- **Every public image is served through the admin**, at
  `/api/media/file/<name>`. Each view runs a function, reads R2 and writes a
  budget row. That is fine for a few images and wrong for a gallery. See the
  open work below before adding many photos.
- **A local dev server needs the admin running too** if `.env.local` sets
  `CMS_URL=http://localhost:3001`. With the admin stopped every page is a 500.
- **Astro allows one dev server per checkout.**
- **`public/1/`–`public/7/`, `full-site/`, `lyrics/`, `coming-soon/` and
  `fonts.html`** are earlier design concepts kept at their old URLs. They are
  served with `noindex`. They are not part of the site; do not link to them.
- **`scripts/notion/` and `content/`** are the old Notion pipeline. `bun run pull`
  still works and is only needed to reconcile Notion before the apex cutover.
  The Notion webhook and nightly rebuild functions have been removed.

## Open work

These need a person with the right account, or a decision. None is blocked by code.

1. **Add the backup secrets** (`BACKUP_DATABASE_URL`, `BACKUP_PASSPHRASE`) so
   the nightly backup starts running.
2. **Password recovery.** Configure SMTP in the `ptl-admin` Vercel project, or
   at least create a second super admin. Today a forgotten password on the
   only super-admin account has no reset path.
3. **Rename or promote the Neon branch** `admin-development` so its name says
   it is live.
4. **Point the mobile video at the smaller file.** In the admin, Settings →
   Homepage & footer → Background video: set width 0 to
   `/media/hero-mobile.mp4` and `/media/hero-mobile.webm`, and add width 768
   with `/media/hero.mp4` and `/media/hero.webm`.
5. **Serve public media from a CDN** (an R2 custom domain or public bucket for
   released files) before the site carries many photos.
6. **Apex cutover.** `peoplestheatrelaboratory.com` still serves the old
   deployment. Before switching: reconcile Notion changes made since the
   import, then move the domain to the new deployment.
7. **Revalidation cost.** Each publish re-renders every page. This grows with
   events × songs; narrow it to affected paths if publishes become slow.
