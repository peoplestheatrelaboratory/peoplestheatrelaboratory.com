/**
 * Add a gathering's setlist to the PTL Master Library.
 *
 * Reads an import file (see content/imports/*.json): the event slug, the
 * songs in the order they were sung, and the lyrics + poets of any song that
 * is new to the library. Existing songs and artists are matched by Slug and
 * left untouched, so the script can be re-run safely.
 *
 * With a token it writes to Notion — new artists, new songs (Published when
 * they have lyrics, Draft when they do not), and the event's ordered Setlist
 * relation — then you run `pull` to refresh the committed snapshot:
 *
 *   NOTION_TOKEN=$(ntn auth token) node scripts/notion/add-setlist.mjs content/imports/2026-09-06-ahmedabad.json
 *   NOTION_TOKEN=$(ntn auth token) node scripts/notion/pull.mjs
 *
 * Without a token, `--snapshot` patches content/site/*.json directly in the
 * exact shape `pull` produces, so the site can be built and shipped now and
 * Notion brought up to date later with the same file:
 *
 *   node scripts/notion/add-setlist.mjs content/imports/2026-09-06-ahmedabad.json --snapshot
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const SNAPSHOT = args.includes('--snapshot');
if (!file) throw new Error('usage: add-setlist.mjs <import.json> [--snapshot]');

const TOKEN = process.env.NOTION_TOKEN;
const OUT = 'content/site';
const IDS_FILE = 'content/notion-ids.json';
const imp = JSON.parse(fs.readFileSync(file, 'utf8'));

const stanzasOf = (lyrics) => (lyrics ?? '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
const isPublished = (s) => stanzasOf(s.lyrics).length > 0;

// ── sanity: every setlist slug must be an existing or a new song ─────────
const newSongs = Object.fromEntries(imp.songs.map((s) => [s.slug, s]));
for (const s of imp.songs) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug)) throw new Error(`bad slug "${s.slug}"`);

if (!TOKEN && !SNAPSHOT) {
  console.error('add-setlist: NOTION_TOKEN not set. Run `ntn login`, or pass --snapshot to patch content/site/ directly.');
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════
// Snapshot mode — patch the committed JSON the way pull.mjs would write it.
// ═════════════════════════════════════════════════════════════════════════
if (!TOKEN) {
  const read = (n) => JSON.parse(fs.readFileSync(path.join(OUT, `${n}.json`), 'utf8'));
  const write = (n, d) => fs.writeFileSync(path.join(OUT, `${n}.json`), JSON.stringify(d, null, 2) + '\n');
  const artists = read('artists');
  const songs = read('songs');
  const events = read('events');

  const have = new Set(artists.map((a) => a.slug));
  const addedArtists = [];
  for (const a of imp.artists ?? []) {
    if (have.has(a.slug)) continue;
    addedArtists.push({ slug: a.slug, name: a.name, nameDeva: a.nameDeva ?? '', roles: a.roles ?? [], era: a.era ?? '', link: a.link ?? '', photo: '', note: '' });
  }
  // pull keeps Notion's newest-first order, so new rows go to the front
  const nextArtists = [...addedArtists.reverse(), ...artists];
  const artistSlugs = new Set(nextArtists.map((a) => a.slug));

  const haveSongs = new Set(songs.map((s) => s.slug));
  const addedSongs = [];
  for (const s of imp.songs) {
    if (haveSongs.has(s.slug) || !isPublished(s)) continue; // pull only ships Published rows
    addedSongs.push({
      slug: s.slug,
      title: s.title,
      titleLatin: s.titleLatin ?? '',
      poets: (s.poets ?? []).filter((p) => artistSlugs.has(p)),
      singers: (s.singers ?? []).filter((p) => artistSlugs.has(p)),
      language: s.language ?? [],
      genre: s.genre ?? [],
      geography: s.geography ?? [],
      raag: s.raag ?? '',
      lyrics: stanzasOf(s.lyrics),
      meaning: s.meaning ?? '',
      references: s.references ?? [],
    });
  }
  const nextSongs = [...addedSongs.reverse(), ...songs];
  const songSlugs = new Set(nextSongs.map((s) => s.slug));

  const ev = events.find((e) => e.slug === imp.event);
  if (!ev) throw new Error(`event "${imp.event}" is not in ${OUT}/events.json — create it in Notion and pull first`);
  const dropped = imp.setlist.filter((k) => !songSlugs.has(k));
  ev.setlist = imp.setlist.filter((k) => songSlugs.has(k));

  write('artists', nextArtists);
  write('songs', nextSongs);
  write('events', events);
  console.log(`snapshot: +${addedArtists.length} artists, +${addedSongs.length} songs, ${imp.event} setlist = ${ev.setlist.length} songs`);
  if (dropped.length) console.log(`  left out (no lyrics yet, or unknown slug): ${dropped.join(', ')}`);
  process.exit(0);
}

// ═════════════════════════════════════════════════════════════════════════
// Notion mode.
// ═════════════════════════════════════════════════════════════════════════
const ids = JSON.parse(fs.readFileSync(IDS_FILE, 'utf8'));
const saveIds = () => fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2) + '\n');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(p, body, method = body ? 'POST' : 'GET') {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.notion.com' + p, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 5) throw new Error(`${method} ${p}: ${res.status}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${json.message}`);
    await sleep(350);
    return json;
  }
}

const rt = (s) => (s ? [{ type: 'text', text: { content: String(s).slice(0, 2000) } }] : []);
const title = (s) => ({ title: rt(s) });
const text = (s) => ({ rich_text: rt(s) });
const select = (s) => (s ? { select: { name: s } } : { select: null });
const multi = (arr) => ({ multi_select: (arr ?? []).map((name) => ({ name })) });
const relation = (pageIds) => ({ relation: pageIds.filter(Boolean).map((id) => ({ id })) });
const para = (s) => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt(s) } });
const heading = (s) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt(s) } });
const quote = (s) => ({ object: 'block', type: 'quote', quote: { rich_text: rt(s) } });

/** Find a page in a data source by its Slug. */
async function findBySlug(dsKey, slug) {
  const r = await api(`/v1/data_sources/${ids.ds[dsKey]}/query`, { filter: { property: 'Slug', rich_text: { equals: slug } }, page_size: 1 });
  return r.results[0]?.id;
}

async function ensureArtist(a) {
  const key = `artist:${a.slug}`;
  const found = ids.pages[key] ?? (await findBySlug('artists', a.slug));
  if (found) { ids.pages[key] = found; return found; }
  const page = await api('/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: ids.ds.artists },
    properties: {
      Name: title(a.name),
      'Name (Devanagari)': text(a.nameDeva),
      Slug: text(a.slug),
      Role: multi(a.roles),
      'Era / Region': text(a.era),
      Status: select('Published'),
    },
  });
  ids.pages[key] = page.id;
  saveIds();
  console.log(`  + artist ${a.name}`);
  return page.id;
}

/** Song body in the shape pull.mjs reads: Lyrics callout (one paragraph per stanza), Meaning quote. */
function songChildren(s) {
  const stanzas = stanzasOf(s.lyrics);
  const children = [];
  if (stanzas.length) {
    children.push(heading('Lyrics'));
    children.push({
      object: 'block',
      type: 'callout',
      callout: { icon: { type: 'emoji', emoji: '🎼' }, rich_text: rt(stanzas[0]), children: stanzas.slice(1, 100).map(para) },
    });
  }
  if (s.meaning) {
    children.push(heading('Meaning'));
    children.push(quote(s.meaning));
  }
  return children;
}

async function ensureSong(s) {
  const key = `song:${s.slug}`;
  const found = ids.pages[key] ?? (await findBySlug('songs', s.slug));
  if (found) { ids.pages[key] = found; console.log(`  = song ${s.titleLatin || s.title} (exists)`); return found; }
  const page = await api('/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: ids.ds.songs },
    properties: {
      Title: title(s.title),
      'Title (Latin)': text(s.titleLatin),
      Slug: text(s.slug),
      Poet: relation((s.poets ?? []).map((p) => ids.pages[`artist:${p}`])),
      'Singers / Composers': relation((s.singers ?? []).map((p) => ids.pages[`artist:${p}`])),
      Language: multi(s.language),
      Genre: multi(s.genre),
      Geography: multi(s.geography),
      Raag: text(s.raag),
      'Has lyrics': { checkbox: isPublished(s) },
      'Has meaning': { checkbox: !!s.meaning },
      Status: select(isPublished(s) ? 'Published' : 'Draft'),
    },
    children: songChildren(s),
  });
  ids.pages[key] = page.id;
  saveIds();
  console.log(`  + song ${s.titleLatin || s.title}${isPublished(s) ? '' : ' (Draft — no lyrics)'}`);
  return page.id;
}

console.log('add-setlist: artists');
for (const a of imp.artists ?? []) await ensureArtist(a);
// poets referenced by songs but not declared in the import must already exist
for (const s of imp.songs) for (const p of [...(s.poets ?? []), ...(s.singers ?? [])]) {
  if (!ids.pages[`artist:${p}`]) {
    const id = await findBySlug('artists', p);
    if (!id) throw new Error(`song ${s.slug}: unknown artist "${p}"`);
    ids.pages[`artist:${p}`] = id;
  }
}

console.log('add-setlist: songs');
for (const s of imp.songs) await ensureSong(s);

console.log('add-setlist: setlist');
const setlistIds = [];
for (const k of imp.setlist) {
  const id = ids.pages[`song:${k}`] ?? (await findBySlug('songs', k));
  if (!id) throw new Error(`setlist: song "${k}" is neither in Notion nor in the import`);
  ids.pages[`song:${k}`] = id;
  setlistIds.push(id);
}
const eventId = ids.pages[`event:${imp.event}`] ?? (await findBySlug('events', imp.event));
if (!eventId) throw new Error(`event "${imp.event}" not found in Notion`);
ids.pages[`event:${imp.event}`] = eventId;
saveIds();
await api(`/v1/pages/${eventId}`, { properties: { Setlist: relation(setlistIds) } }, 'PATCH');
console.log(`  ${imp.event}: Setlist = ${setlistIds.length} songs`);
console.log('add-setlist: done — now run pull to refresh content/site/');
