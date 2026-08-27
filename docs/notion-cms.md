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

## Access needed
An **internal Notion integration** with read + insert + update content, connected
to the *Master Library* page. It must be created by a **member/owner of the
"અલગારી" workspace** (guests cannot create integrations). Put the secret in
`.env` as `NOTION_TOKEN=` — never commit it.

## Notion gotchas we handle
- Image/file URLs expire after 1 h → always downloaded at build.
- 3 requests/second → fine at build; never call Notion at runtime.
- Relations return ids only → loader resolves them in one pass per DB.
- Properties can be renamed by anyone → Zod schema in the loader fails the
  build loudly with the property name, instead of shipping blanks.
