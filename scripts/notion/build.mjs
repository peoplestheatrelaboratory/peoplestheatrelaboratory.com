/**
 * Build the PTL Master Library in Notion from content/library.json.
 *
 * Creates seven databases under the parent page (Artists, Songs, Events, Team,
 * Blog, Scripts, Quotes), then inserts artists → songs → events with relations and
 * page bodies. Idempotent: ids are remembered in content/notion-ids.json, so
 * re-running only creates what is missing.
 *
 *   NOTION_TOKEN=$(ntn auth token) node scripts/notion/build.mjs
 */
import fs from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
if (!TOKEN) throw new Error('NOTION_TOKEN missing — run with NOTION_TOKEN=$(ntn auth token)');
const PARENT_PAGE = process.env.NOTION_PARENT ?? '3c9bb969-ec34-81d1-a524-cae3d17cc299';
const IDS_FILE = 'content/notion-ids.json';

const lib = JSON.parse(fs.readFileSync('content/library.json', 'utf8'));
const ids = fs.existsSync(IDS_FILE) ? JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')) : { db: {}, ds: {}, pages: {} };
const save = () => fs.writeFileSync(IDS_FILE, JSON.stringify(ids, null, 2) + '\n');

// ── tiny client with rate limiting + retry ────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, body, method = body ? 'POST' : 'GET') {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch('https://api.notion.com' + path, {
      method,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2025-09-03',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 5) throw new Error(`${method} ${path}: ${res.status}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${json.message}`);
    await sleep(350); // stay under 3 req/s
    return json;
  }
}

// ── rich text helpers ─────────────────────────────────────────────────────
const rt = (s) => (s ? [{ type: 'text', text: { content: String(s).slice(0, 2000) } }] : []);
const title = (s) => ({ title: rt(s) });
const text = (s) => ({ rich_text: rt(s) });
const select = (s) => (s ? { select: { name: s } } : { select: null });
const multi = (arr) => ({ multi_select: (arr ?? []).map((name) => ({ name })) });
const relation = (pageIds) => ({ relation: pageIds.filter(Boolean).map((id) => ({ id })) });
const date = (iso) => (iso ? { date: { start: iso } } : { date: null });
const url = (u) => ({ url: u || null });
const number = (n) => ({ number: n ?? null });

/** Paragraph blocks for long text; Notion caps a rich_text item at 2000 chars. */
function paragraphs(s, wrap = (b) => b) {
  return s
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => wrap({ object: 'block', type: 'paragraph', paragraph: { rich_text: rt(p) } }));
}
const heading = (s) => ({ object: 'block', type: 'heading_2', heading_2: { rich_text: rt(s) } });
const quote = (s) => ({ object: 'block', type: 'quote', quote: { rich_text: rt(s.slice(0, 2000)) } });
const bookmark = (u) => ({ object: 'block', type: 'bookmark', bookmark: { url: u } });

// ── databases ─────────────────────────────────────────────────────────────
const STATUS = { select: { options: [{ name: 'Draft', color: 'gray' }, { name: 'Published', color: 'green' }, { name: 'Archived', color: 'brown' }] } };

async function ensureDb(key, name, emoji, properties) {
  if (ids.db[key]) return ids.ds[key];
  const db = await api('/v1/databases', {
    parent: { type: 'page_id', page_id: PARENT_PAGE },
    icon: { type: 'emoji', emoji },
    title: rt(name),
    initial_data_source: { properties },
  });
  ids.db[key] = db.id;
  ids.ds[key] = db.data_sources[0].id;
  save();
  console.log(`db ${name} → ${db.id}`);
  return ids.ds[key];
}

/** Add properties to an existing data source (used for relations after both sides exist). */
async function addProps(key, properties) {
  await api(`/v1/data_sources/${ids.ds[key]}`, { properties }, 'PATCH');
}

const rel = (targetKey, dual) => ({
  relation: {
    data_source_id: ids.ds[targetKey],
    ...(dual ? { type: 'dual_property', dual_property: { synced_property_name: dual } } : { type: 'single_property', single_property: {} }),
  },
});

async function createDatabases() {
  await ensureDb('artists', 'Artists', '🎙️', {
    Name: { title: {} },
    'Name (Devanagari)': { rich_text: {} },
    Slug: { rich_text: {} },
    Role: { multi_select: { options: ['Poet', 'Singer / Composer', 'Painter', 'Folk tradition'].map((name) => ({ name })) } },
    'Era / Region': { rich_text: {} },
    Status: STATUS,
  });
  await ensureDb('songs', 'Songs', '🎼', {
    Title: { title: {} },
    'Title (Latin)': { rich_text: {} },
    Slug: { rich_text: {} },
    Poet: rel('artists', 'Songs (poet)'),
    'Singers / Composers': rel('artists', 'Songs (performer)'),
    Language: { multi_select: { options: ['Hindi', 'Gujarati', 'Rajasthani', 'Bengali', 'Punjabi', 'Sanskrit', 'Urdu'].map((name) => ({ name })) } },
    Genre: { multi_select: { options: ['Nirgun', 'Bhajan', 'Lagna Geet', 'Folk', 'Qawwali', 'Sufi'].map((name) => ({ name })) } },
    Geography: { multi_select: {} },
    Raag: { rich_text: {} },
    'Has lyrics': { checkbox: {} },
    'Has meaning': { checkbox: {} },
    Source: { select: { options: [{ name: 'notion' }, { name: 'canva' }] } },
    Status: STATUS,
  });
  await ensureDb('events', 'Events', '🌕', {
    Name: { title: {} },
    'Name (Devanagari)': { rich_text: {} },
    Slug: { rich_text: {} },
    Series: { select: { options: [{ name: 'Baithak', color: 'orange' }, { name: 'Kabir Sang Ruhdaari', color: 'red' }, { name: 'Production', color: 'purple' }, { name: 'Workshop', color: 'blue' }] } },
    Date: { date: {} },
    Tithi: { rich_text: {} },
    Venue: { rich_text: {} },
    City: { select: { options: [{ name: 'Vadodara' }, { name: 'Ahmedabad' }] } },
    Summary: { rich_text: {} },
    'Registration URL': { url: {} },
    Cover: { files: {} },
    Setlist: rel('songs', 'Events'),
    Artists: rel('artists', 'Events'),
    Status: STATUS,
  });
  await ensureDb('team', 'Team', '🧑‍🤝‍🧑', {
    Name: { title: {} },
    'Name (Devanagari)': { rich_text: {} },
    Slug: { rich_text: {} },
    Role: { rich_text: {} },
    Order: { number: { format: 'number' } },
    Photo: { files: {} },
    Socials: { url: {} },
    Status: STATUS,
  });
  await ensureDb('blog', 'Blog', '✍️', {
    Title: { title: {} },
    Slug: { rich_text: {} },
    Date: { date: {} },
    Author: rel('team', 'Posts'),
    Excerpt: { rich_text: {} },
    Cover: { files: {} },
    Tags: { multi_select: {} },
    'Related event': rel('events', 'Posts'),
    Status: STATUS,
  });
  await ensureDb('scripts', 'Scripts', '📜', {
    Title: { title: {} },
    'Title (Devanagari)': { rich_text: {} },
    Slug: { rich_text: {} },
    Playwright: rel('artists', 'Scripts'),
    Language: { multi_select: {} },
    Year: { number: { format: 'number' } },
    File: { files: {} },
    Synopsis: { rich_text: {} },
    Productions: rel('events', 'Scripts'),
    Status: STATUS,
  });
  await ensureDb('quotes', 'Quotes', '🪔', {
    Couplet: { title: {} },
    Translation: { rich_text: {} },
    Attribution: { rich_text: {} },
    Poet: rel('artists', 'Quotes'),
    Order: { number: { format: 'number' } },
    Status: STATUS,
  });
}

// ── pages ─────────────────────────────────────────────────────────────────
async function ensurePage(key, dsKey, properties, children = [], icon) {
  if (ids.pages[key]) return ids.pages[key];
  const page = await api('/v1/pages', {
    parent: { type: 'data_source_id', data_source_id: ids.ds[dsKey] },
    ...(icon ? { icon: { type: 'emoji', emoji: icon } } : {}),
    properties,
    children: children.slice(0, 100),
  });
  ids.pages[key] = page.id;
  save();
  return page.id;
}

async function loadArtists() {
  for (const a of lib.artists) {
    await ensurePage(`artist:${a.slug}`, 'artists', {
      Name: title(a.name),
      'Name (Devanagari)': text(a.nameDeva),
      Slug: text(a.slug),
      Role: multi(a.roles.map((r) => (r.startsWith('Folk') ? 'Folk tradition' : r))),
      Status: select('Published'),
    }, a.note ? paragraphs(a.note) : []);
  }
  console.log(`artists: ${lib.artists.length}`);
}

async function loadSongs() {
  for (const s of lib.songs) {
    const children = [];
    if (s.lyrics) {
      children.push(heading('Lyrics'));
      // one callout holding the verses, each stanza its own paragraph inside
      children.push({
        object: 'block',
        type: 'callout',
        callout: { icon: { type: 'emoji', emoji: '🎼' }, rich_text: rt(s.lyrics.split(/\n{2,}/)[0]), children: paragraphs(s.lyrics).slice(1, 100) },
      });
    }
    if (s.meaning) {
      children.push(heading('Meaning'));
      children.push(quote(s.meaning));
    }
    if (s.references.length) {
      children.push(heading('References'));
      for (const r of s.references) children.push(bookmark(r.url));
    }
    await ensurePage(`song:${s.slug}`, 'songs', {
      Title: title(s.title),
      'Title (Latin)': text(s.titleLatin),
      Slug: text(s.slug),
      Poet: relation(s.poets.map((p) => ids.pages[`artist:${p}`])),
      'Singers / Composers': relation(s.singers.map((p) => ids.pages[`artist:${p}`])),
      Language: multi(s.language),
      Genre: multi(s.genre),
      Geography: multi(s.geography),
      Raag: text(s.raag),
      'Has lyrics': { checkbox: !!s.lyrics },
      'Has meaning': { checkbox: !!s.meaning },
      Source: select(s.source),
      Status: select(s.lyrics ? 'Published' : 'Draft'),
    }, children);
  }
  console.log(`songs: ${lib.songs.length}`);
}

async function loadEvents() {
  for (const e of lib.events) {
    const setlist = e.setlist.map((k) => ids.pages[`song:${k}`]);
    const performers = new Set();
    for (const k of e.setlist) for (const p of lib.songs.find((s) => s.slug === k)?.singers ?? []) performers.add(ids.pages[`artist:${p}`]);
    await ensurePage(`event:${e.slug}`, 'events', {
      Name: title(e.title),
      'Name (Devanagari)': text(e.titleDeva),
      Slug: text(e.slug),
      Series: select(e.series),
      Date: date(e.date),
      Tithi: text(e.tithi),
      Venue: text(e.venue),
      City: select(e.city),
      Summary: text(e.summary),
      Setlist: relation(setlist),
      Artists: relation([...performers]),
      Status: select('Published'),
    }, paragraphs(e.summary));
  }
  console.log(`events: ${lib.events.length}`);
}

/**
 * The doha pool, taken from the sample direction in public/5. The homepage
 * hero shows the lowest-Order published quote; the rest are the pool the
 * couplet can be drawn from.
 * [slug, couplet, translation, attribution, artist slug (may be ''), order]
 */
const QUOTES = [
  ['moko-kahan', 'मोको कहाँ ढूंढे बन्दे, मैं तो तेरे पास में।', 'Where do you search for me? I am right beside you.', 'Kabir', 'kabir', 1],
  ['dhai-akhar', 'पोथी पढ़ि पढ़ि जग मुआ, पंडित भया न कोय। ढाई आखर प्रेम का, पढ़े सो पंडित होय॥', 'Reading book upon book the whole world died, and none grew wise. Read two and a half letters of love — become the scholar.', 'Kabir', 'kabir', 2],
  ['bura-jo-dekhan', 'बुरा जो देखन मैं चला, बुरा न मिलिया कोय। जो दिल खोजा आपना, मुझसे बुरा न कोय॥', 'I went out to find the wicked and found no one. I searched my own heart — no one more wicked than me.', 'Kabir', 'kabir', 3],
  ['sai-itna-dijiye', 'साईं इतना दीजिये, जा में कुटुम समाय। मैं भी भूखा न रहूँ, साधु न भूखा जाय॥', 'Give me only this much, Lord — enough to hold the household: that I do not go hungry, and no guest leaves hungry.', 'Kabir', 'kabir', 4],
  ['mati-kahe-kumhar', 'माटी कहे कुम्हार से, तू क्या रौंदे मोय। एक दिन ऐसा आएगा, मैं रौंदूँगी तोय॥', 'The clay says to the potter: why do you knead me? A day will come when I will knead you.', 'Kabir', 'kabir', 5],
  ['chalti-chakki', 'चलती चक्की देख के, दिया कबीरा रोय। दो पाटन के बीच में, साबुत बचा न कोय॥', 'Watching the millstones turn, Kabir wept: between the two stones, nothing comes through whole.', 'Kabir', 'kabir', 6],
  ['payo-ji-maine', 'पायो जी मैंने राम रतन धन पायो।', 'I have found it — the jewel-wealth of the Name.', 'Mira Bai', 'mira-bai', 7],
  ['man-changa', 'मन चंगा तो कठौती में गंगा।', 'If the heart is clear, the Ganga flows in your washbowl.', 'Raidas', 'raidas', 8],
  ['bulla-ki-jana', 'बुल्ला! की जाणा मैं कौण।', 'Bulleh! Who knows who I am?', 'Bulleh Shah', '', 9]
];

async function loadQuotes() {
  for (const [slug, couplet, translation, attribution, poet, order] of QUOTES) {
    await ensurePage(`quote:${slug}`, 'quotes', {
      Couplet: title(couplet),
      Translation: text(translation),
      Attribution: text(attribution),
      Poet: relation([ids.pages[`artist:${poet}`]]),
      Order: number(order),
      Status: select('Published'),
    });
  }
  console.log(`quotes: ${QUOTES.length}`);
}

await createDatabases();
await loadArtists();
await loadSongs();
await loadEvents();
await loadQuotes();
console.log('done →', `https://app.notion.com/p/${PARENT_PAGE.replace(/-/g, '')}`);
