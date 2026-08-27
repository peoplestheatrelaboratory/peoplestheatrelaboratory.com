# Notion as the PTL CMS

Notion is the single source of content. The site is built statically by Astro
from Notion at build time and rebuilt whenever content changes.

```
Notion (edit)  ──webhook──▶  Vercel function (verify + debounce)
                                   │
                                   ▼  deploy hook
                            Astro build (Content Layer loaders)
                                   │  downloads images/PDFs, resolves relations
                                   ▼
                            static HTML on Vercel CDN
```

Nightly scheduled rebuild as a safety net. If a route ever needs seconds-fresh
data (event-day changes), switch *that route only* to SSR + ISR.

## Databases (all under "Master Library")

Every DB gets `Slug` (text, unique, URL-safe) and `Status` (select:
`Draft` / `Published` / `Archived`). The site only reads `Published`.

### Events   (existing "Events Database" → restructure)
| Property | Type | Notes |
|---|---|---|
| Name | title | English, e.g. `Kabir Sang Ruhdaari 2026` |
| Name (Devanagari) | text | `कबीर संग रुहदारी २०२६` |
| Slug | text | `kabir-sang-ruhdaari-2026-vadodara` |
| Series | select | `Baithak` · `Kabir Sang Ruhdaari` · `Production` · `Workshop` |
| Date | date | leave empty when the day is not on record |
| Tithi | text | `Jyestha Poornima`, `Phag Poonam` … |
| Venue | text | |
| City | select | `Vadodara` · `Ahmedabad` … |
| Summary | text | one or two sentences, shown in lists |
| Registration URL | url | shown as "Register →" when set |
| Cover | files | one image |
| Setlist | relation → Songs | **ordered** — the order sung |
| Artists | relation → Artists | performers that evening |
| Status | select | |
| *page body* | | long description, gallery, notes |

### Songs   (existing "Songs Library" → split the title, add lyrics fields)
| Property | Type | Notes |
|---|---|---|
| Title | title | Devanagari/Gujarati as sung, e.g. `साँई बिन दरद` |
| Title (Latin) | text | `Sai Bin Darad` (today both are crammed into one title) |
| Slug | text | `sai-bin-darad` |
| Poet | relation → Artists | was "Original Writer" |
| Singers / Composers | relation → Artists | keep |
| Language | multi-select | Hindi · Gujarati · Rajasthani · Bengali · Sanskrit · Punjabi |
| Genre | multi-select | Nirgun · Bhajan · Lagna Geet · Folk … |
| Geography | multi-select | keep |
| Raag | text | keep |
| Has meaning | checkbox | auto-set by the importer |
| Events | relation | back-relation of Events.Setlist |
| Status | select | |
| *page body* | | `## Lyrics` verses, then optional `## Meaning` (Hindi/English) |

The importer will add the ~21 songs from the two Canva sites that are not yet
in Notion (35 harvested, 31 with lyrics, 10 with meanings; source:
`public/lyrics/songs.js`), and fill lyrics into the existing 14 where missing.

### Artists   (existing "Artist Library" → add roles)
| Property | Type | Notes |
|---|---|---|
| Name | title | `Kabir` |
| Name (Devanagari) | text | `कबीर` |
| Slug | text | |
| Role | multi-select | `Poet` · `Singer` · `Composer` · `Painter` · `Folk tradition` |
| Era / Region | text | `15th c. · Kashi` |
| Songs (poet) / Songs (performer) | relations | back-relations |
| *page body* | | short note |

### Team   (new)
| Property | Type |
|---|---|
| Name | title |
| Name (Devanagari) | text |
| Slug | text |
| Role | text — `Founder / Director`, `Musician`, … |
| Order | number — display order |
| Photo | files |
| Socials | url |
| Status | select |
| *page body* | bio |

### Blog   (new)
| Property | Type |
|---|---|
| Title | title |
| Slug | text |
| Date | date |
| Author | relation → Team |
| Excerpt | text |
| Cover | files |
| Tags | multi-select |
| Related event | relation → Events |
| Status | select |
| *page body* | the post |

### Scripts   (new)
| Property | Type |
|---|---|
| Title | title |
| Title (Devanagari) | text |
| Slug | text |
| Playwright | relation → Artists |
| Language | multi-select |
| Year | number |
| File | files — PDF, downloaded at build |
| Synopsis | text |
| Productions | relation → Events (Series = Production) |
| Status | select |
| *page body* | notes, or the script itself as blocks |

## Site mapping
| Route | Source |
|---|---|
| `/` | next Published Event (the "upcoming event is the homepage" rule) |
| `/events`, `/events/[slug]` | Events — built now on a JSON seed (`src/data/events.json`, accessor `src/lib/events.ts`) that mirrors this schema |
| `/library`, `/library/songs/[slug]` | Songs + Artists |
| `/library/scripts/[slug]` | Scripts |
| `/blog/[slug]` | Blog |
| `/about` | Team (bios section) |

## Where it lives now (2026-08-27)
The library was rebuilt in **Yash's Workspace** — top-level page *PTL Master
Library*, https://app.notion.com/p/3c9bb969ec3481d1a524cae3d17cc299 — because
the owner's "અલગારી" workspace never got an integration. Database and data-source
ids: `content/notion-ids.json`.

## How content flows
```
bun run pull   →  scripts/notion/pull.mjs  →  content/site/*.json  (+ public/notion/ media)
bun run build  →  runs `pull` first (prebuild), then astro build reads the JSON
```
- `pull` needs `NOTION_TOKEN`; without it the **committed snapshot** is used, so
  the site always builds. Locally: `NOTION_TOKEN=$(ntn auth token) bun run pull`.
- Only rows with `Status = Published` are pulled. Song pages read `## Lyrics`
  (callout), `## Meaning` (quote), `## References` (bookmarks/links).
- Images/files in Notion expire after 1 h, so `pull` copies them to
  `public/notion/<hash>.<ext>` and rewrites the URLs.

## Vercel setup (one-time, by a project owner)
1. **Environment variables** (Project → Settings → Environment Variables):
   `NOTION_TOKEN` (from `ntn auth token`, or a dedicated internal integration
   connected to *PTL Master Library*), `NOTION_WEBHOOK_SECRET`,
   `VERCEL_DEPLOY_HOOK_URL`.
2. **Deploy hook**: Settings → Git → Deploy Hooks → create one for `main`
   (or `dev`); paste its URL into `VERCEL_DEPLOY_HOOK_URL`.
3. **Notion webhook**: at notion.so/profile/integrations → the integration →
   *Webhooks* → subscribe `https://peoplestheatrelaboratory.com/api/notion-webhook`
   to `page.*` and `data_source.*` events. Notion sends a one-time
   `verification_token`; the function logs it — copy it into
   `NOTION_WEBHOOK_SECRET` and redeploy, then confirm the subscription.
4. Optional safety net: a Vercel cron or GitHub Action that hits the deploy hook
   nightly.

After that: edit in Notion → set Status to Published → the site rebuilds itself
within ~2 minutes. `api/notion-webhook.ts` verifies the HMAC signature before
triggering anything.

## Committing snapshots
`content/site/*.json` and `public/notion/` are committed on purpose: they are
the fallback when no token is present and they make every build reproducible.
Re-run `pull` and commit when you want the fallback refreshed.

## Notion gotchas we handle
- Image/file URLs expire after 1 h → always downloaded at build.
- 3 requests/second → fine at build; never call Notion at runtime.
- Relations return ids only → loader resolves them in one pass per DB.
- Properties can be renamed by anyone → Zod schema in the loader fails the
  build loudly with the property name, instead of shipping blanks.
