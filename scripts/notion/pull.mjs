/**
 * Pull the PTL Master Library from Notion into content/site/*.json.
 *
 * This is the site's content layer: pages read these JSON files at build
 * time, so the build never talks to Notion at runtime. Run it before a build
 * whenever NOTION_TOKEN is present (Vercel does, via `bun run build`); without
 * a token the committed snapshot is used as-is.
 *
 *   NOTION_TOKEN=$(ntn auth token) node scripts/notion/pull.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TOKEN = process.env.NOTION_TOKEN;
const ids = JSON.parse(fs.readFileSync('content/notion-ids.json', 'utf8'));
const OUT = 'content/site';
const MEDIA_DIR = 'public/notion';
const MEDIA_URL = '/notion';

if (!TOKEN) {
  console.log('pull: NOTION_TOKEN not set — keeping the committed snapshot in', OUT);
  process.exit(0);
}

// A pull that fails must never fail the build: the committed snapshot stays
// in place and the site ships from it — loudly.
const bail = (err) => {
  console.error('\npull: FAILED —', err?.message ?? err);
  console.error('pull: keeping the committed snapshot in', OUT, '(content may be stale)\n');
  process.exit(0);
};
process.on('unhandledRejection', bail);
process.on('uncaughtException', bail);

// ── client ────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(p, body, method = body ? 'POST' : 'GET') {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch('https://api.notion.com' + p, {
        method,
        headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      if (attempt > 5) throw err; // transport errors (ECONNRESET etc.)
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      if (attempt > 5) throw new Error(`${method} ${p}: ${res.status}`);
      await sleep(1000 * (attempt + 1));
      continue;
    }
    const json = await res.json();
    if (!res.ok) throw new Error(`${method} ${p}: ${res.status} ${json.message}`);
    await sleep(340);
    return json;
  }
}

async function queryAll(dsId) {
  const rows = [];
  let cursor;
  do {
    const r = await api(`/v1/data_sources/${dsId}/query`, { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    rows.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return rows;
}

async function blocksOf(blockId) {
  const out = [];
  let cursor;
  do {
    const r = await api(`/v1/blocks/${blockId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const b of r.results) {
      if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') b.children = await blocksOf(b.id);
      out.push(b);
    }
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

// ── property readers ─────────────────────────────────────────────────────
const plain = (arr) => (arr ?? []).map((t) => t.plain_text).join('');
const P = {
  title: (p) => plain(p?.title),
  text: (p) => plain(p?.rich_text),
  select: (p) => p?.select?.name ?? '',
  multi: (p) => (p?.multi_select ?? []).map((o) => o.name),
  date: (p) => p?.date?.start?.slice(0, 10) ?? null, // drop any time part
  checkbox: (p) => !!p?.checkbox,
  url: (p) => p?.url ?? '',
  number: (p) => p?.number ?? null,
  relation: (p) => (p?.relation ?? []).map((r) => r.id), // see fullRelation for >25
  files: (p) => (p?.files ?? []).map((f) => ({ name: f.name, url: f.type === 'file' ? f.file.url : f.external?.url })),
};

/** Notion embeds at most 25 relation ids in a page; page the rest via the property endpoint. */
async function fullRelation(page, name) {
  const prop = page.properties[name];
  if (!prop) return [];
  if (!prop.has_more) return P.relation(prop);
  const ids = [];
  let cursor;
  do {
    const r = await api(`/v1/pages/${page.id}/properties/${prop.id}?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    for (const item of r.results) ids.push(item.relation.id);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return ids;
}

/** Fail loudly when a database no longer has the properties the site reads. */
function need(row, dbName, names) {
  const missing = names.filter((n) => !(n in row.properties));
  if (missing.length) throw new Error(`${dbName}: property missing or renamed in Notion: ${missing.join(', ')}`);
}

/** Slugs become routes: they must be URL-safe and unique within a database. */
function slugOf(row, dbName, seen) {
  const slug = P.text(row.properties.Slug).trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${dbName}: bad or empty Slug "${slug}" on "${P.title(row.properties.Name ?? row.properties.Title)}"`);
  if (seen.has(slug)) throw new Error(`${dbName}: duplicate Slug "${slug}"`);
  seen.add(slug);
  return slug;
}

// ── media: Notion file URLs expire, so copy them into the build ──────────
fs.mkdirSync(MEDIA_DIR, { recursive: true });
async function localise(url, hint = '') {
  if (!url) return '';
  if (!/notion|amazonaws/.test(url)) return url; // external image, leave it
  const clean = url.split('?')[0];
  const ext = path.extname(clean) || '.jpg';
  const name = crypto.createHash('sha1').update(clean).digest('hex').slice(0, 16) + ext;
  const file = path.join(MEDIA_DIR, name);
  if (!fs.existsSync(file)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed ${hint}: ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return `${MEDIA_URL}/${name}`;
}

// ── rich text → HTML ─────────────────────────────────────────────────────
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function richHtml(arr) {
  return (arr ?? [])
    .map((t) => {
      let s = esc(t.plain_text).replace(/\n/g, '<br>');
      const a = t.annotations ?? {};
      if (a.code) s = `<code>${s}</code>`;
      if (a.bold) s = `<strong>${s}</strong>`;
      if (a.italic) s = `<em>${s}</em>`;
      if (t.href) s = `<a href="${esc(t.href)}">${s}</a>`;
      return s;
    })
    .join('');
}

/** Render a block tree to HTML (the subset editors actually use). */
async function blocksHtml(blocks) {
  let html = '';
  let list = null; // 'ul' | 'ol'
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const b of blocks) {
    const t = b.type;
    const v = b[t];
    if (t === 'bulleted_list_item' || t === 'numbered_list_item') {
      const tag = t === 'bulleted_list_item' ? 'ul' : 'ol';
      if (list !== tag) { closeList(); html += `<${tag}>`; list = tag; }
      html += `<li>${richHtml(v.rich_text)}${b.children ? await blocksHtml(b.children) : ''}</li>`;
      continue;
    }
    closeList();
    switch (t) {
      case 'paragraph': html += `<p>${richHtml(v.rich_text)}</p>`; break;
      case 'heading_1': html += `<h2>${richHtml(v.rich_text)}</h2>`; break;
      case 'heading_2': html += `<h2>${richHtml(v.rich_text)}</h2>`; break;
      case 'heading_3': html += `<h3>${richHtml(v.rich_text)}</h3>`; break;
      case 'quote': html += `<blockquote>${richHtml(v.rich_text)}${b.children ? await blocksHtml(b.children) : ''}</blockquote>`; break;
      case 'callout': html += `<aside class="callout">${richHtml(v.rich_text)}${b.children ? await blocksHtml(b.children) : ''}</aside>`; break;
      case 'divider': html += '<hr>'; break;
      case 'image': {
        const src = await localise(v.type === 'file' ? v.file.url : v.external.url, b.id);
        html += `<figure><img src="${esc(src)}" alt="${esc(plain(v.caption))}" loading="lazy">${v.caption?.length ? `<figcaption>${richHtml(v.caption)}</figcaption>` : ''}</figure>`;
        break;
      }
      case 'bookmark': case 'embed': case 'link_preview':
        html += `<p><a href="${esc(v.url)}" rel="noopener">${esc(plain(v.caption) || v.url)}</a></p>`; break;
      case 'video': {
        const u = v.type === 'external' ? v.external.url : v.file.url;
        html += `<p><a href="${esc(u)}" rel="noopener">${esc(plain(v.caption) || 'Video')}</a></p>`; break;
      }
      case 'toggle': html += `<details><summary>${richHtml(v.rich_text)}</summary>${b.children ? await blocksHtml(b.children) : ''}</details>`; break;
      case 'code': html += `<pre><code>${esc(plain(v.rich_text))}</code></pre>`; break;
      default: break; // unsupported block: skipped on purpose
    }
  }
  closeList();
  return html;
}

/** Song bodies follow a fixed shape: Lyrics callout, Meaning quote, References. */
async function songBody(blocks) {
  const out = { lyrics: [], meaning: '', references: [] };
  let section = '';
  for (const b of blocks) {
    const t = b.type;
    if (t.startsWith('heading_')) { section = plain(b[t].rich_text).toLowerCase(); continue; }
    if (section.startsWith('lyric')) {
      if (t === 'callout') {
        out.lyrics.push(plain(b.callout.rich_text));
        for (const c of b.children ?? []) if (c.type === 'paragraph') out.lyrics.push(plain(c.paragraph.rich_text));
      } else if (t === 'paragraph') out.lyrics.push(plain(b.paragraph.rich_text));
    } else if (section.startsWith('meaning')) {
      if (t === 'quote' || t === 'paragraph') out.meaning += (out.meaning ? '\n\n' : '') + plain(b[t].rich_text);
    } else if (section.startsWith('ref')) {
      if (t === 'bookmark' || t === 'embed') out.references.push({ label: plain(b[t].caption) || b[t].url, url: b[t].url });
      if (t === 'paragraph') for (const r of b.paragraph.rich_text) if (r.href) out.references.push({ label: r.plain_text, url: r.href });
    }
  }
  out.lyrics = out.lyrics.filter((s) => s.trim());
  return out;
}

// ── pull each database ────────────────────────────────────────────────────
const published = (rows) => rows.filter((r) => P.select(r.properties.Status) === 'Published');
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

console.log('pull: artists');
const artistRows = await queryAll(ids.ds.artists);
const artists = [];
const artistSlugs = new Set();
for (const r of published(artistRows)) {
  const p = r.properties;
  need(r, 'Artists', ['Name', 'Name (Devanagari)', 'Slug', 'Role', 'Era / Region', 'Link', 'Photo', 'Status']);
  artists.push({
    id: r.id,
    slug: slugOf(r, 'Artists', artistSlugs),
    name: P.title(p.Name),
    nameDeva: P.text(p['Name (Devanagari)']),
    roles: P.multi(p.Role),
    era: P.text(p['Era / Region']),
    link: P.url(p.Link),
    photo: P.files(p.Photo)[0] ? await localise(P.files(p.Photo)[0].url, r.id) : '',
    note: await blocksHtml(await blocksOf(r.id)),
  });
}
const artistById = byId(artists);

console.log('pull: songs');
const songRows = await queryAll(ids.ds.songs);
const songs = [];
const songSlugs = new Set();
for (const r of published(songRows)) {
  const p = r.properties;
  need(r, 'Songs', ['Title', 'Title (Latin)', 'Slug', 'Poet', 'Singers / Composers', 'Language', 'Genre', 'Geography', 'Raag', 'Status']);
  const body = await songBody(await blocksOf(r.id));
  songs.push({
    id: r.id,
    slug: slugOf(r, 'Songs', songSlugs),
    title: P.title(p.Title),
    titleLatin: P.text(p['Title (Latin)']),
    poets: (await fullRelation(r, 'Poet')).map((id) => artistById[id]?.slug).filter(Boolean),
    singers: (await fullRelation(r, 'Singers / Composers')).map((id) => artistById[id]?.slug).filter(Boolean),
    language: P.multi(p.Language),
    genre: P.multi(p.Genre),
    geography: P.multi(p.Geography),
    raag: P.text(p.Raag),
    ...body,
  });
}
const songById = byId(songs);

console.log('pull: events');
const eventRows = await queryAll(ids.ds.events);
const events = [];
const eventSlugs = new Set();
const songTitleById = Object.fromEntries(songRows.map((r) => [r.id, P.title(r.properties.Title)]));
for (const r of published(eventRows)) {
  const p = r.properties;
  need(r, 'Events', ['Name', 'Name (Devanagari)', 'Slug', 'Series', 'Date', 'Tithi', 'Venue', 'City', 'Summary', 'Registration URL', 'Cover', 'Setlist', 'Artists', 'Status']);
  const cover = P.files(p.Cover)[0];
  const blocks = await blocksOf(r.id);
  const setlistIds = await fullRelation(r, 'Setlist');
  const dropped = setlistIds.filter((id) => !songById[id]);
  if (dropped.length) console.warn(`  ! ${P.title(p.Name)}: ${dropped.length} setlist song(s) not Published, left out: ${dropped.map((id) => songTitleById[id] ?? id).join(', ')}`);
  events.push({
    id: r.id,
    slug: slugOf(r, 'Events', eventSlugs),
    title: P.title(p.Name),
    titleDeva: P.text(p['Name (Devanagari)']),
    series: P.select(p.Series),
    date: P.date(p.Date),
    tithi: P.text(p.Tithi),
    venue: P.text(p.Venue),
    city: P.select(p.City),
    summary: P.text(p.Summary),
    registerUrl: P.url(p['Registration URL']),
    cover: cover ? await localise(cover.url, r.id) : '',
    setlist: setlistIds.map((id) => songById[id]?.slug).filter(Boolean),
    artists: (await fullRelation(r, 'Artists')).map((id) => artistById[id]?.slug).filter(Boolean),
    body: await blocksHtml(blocks),
  });
}
const eventById = byId(events);

console.log('pull: team');
const team = [];
const teamSlugs = new Set();
for (const r of published(await queryAll(ids.ds.team))) {
  const p = r.properties;
  need(r, 'Team', ['Name', 'Name (Devanagari)', 'Slug', 'Role', 'Order', 'Photo', 'Socials', 'Status']);
  const photo = P.files(p.Photo)[0];
  team.push({
    id: r.id,
    slug: slugOf(r, 'Team', teamSlugs),
    name: P.title(p.Name),
    nameDeva: P.text(p['Name (Devanagari)']),
    role: P.text(p.Role),
    order: P.number(p.Order) ?? 999,
    photo: photo ? await localise(photo.url, r.id) : '',
    socials: P.url(p.Socials),
    bio: await blocksHtml(await blocksOf(r.id)),
  });
}
team.sort((a, b) => a.order - b.order);
const teamById = byId(team);

console.log('pull: blog');
const blog = [];
const blogSlugs = new Set();
for (const r of published(await queryAll(ids.ds.blog))) {
  const p = r.properties;
  need(r, 'Blog', ['Title', 'Slug', 'Date', 'Author', 'Excerpt', 'Cover', 'Tags', 'Related event', 'Status']);
  const cover = P.files(p.Cover)[0];
  blog.push({
    id: r.id,
    slug: slugOf(r, 'Blog', blogSlugs),
    title: P.title(p.Title),
    date: P.date(p.Date),
    authors: P.relation(p.Author).map((id) => teamById[id]?.slug).filter(Boolean),
    excerpt: P.text(p.Excerpt),
    cover: cover ? await localise(cover.url, r.id) : '',
    tags: P.multi(p.Tags),
    relatedEvent: P.relation(p['Related event']).map((id) => eventById[id]?.slug).filter(Boolean)[0] ?? '',
    body: await blocksHtml(await blocksOf(r.id)),
  });
}
blog.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

console.log('pull: scripts');
const scripts = [];
const scriptsSlugs = new Set();
for (const r of published(await queryAll(ids.ds.scripts))) {
  const p = r.properties;
  need(r, 'Scripts', ['Title', 'Title (Devanagari)', 'Slug', 'Playwright', 'Language', 'Year', 'File', 'Synopsis', 'Productions', 'Status']);
  const file = P.files(p.File)[0];
  scripts.push({
    id: r.id,
    slug: slugOf(r, 'Scripts', scriptsSlugs),
    title: P.title(p.Title),
    titleDeva: P.text(p['Title (Devanagari)']),
    playwrights: P.relation(p.Playwright).map((id) => artistById[id]?.slug).filter(Boolean),
    language: P.multi(p.Language),
    year: P.number(p.Year),
    file: file ? await localise(file.url, r.id) : '',
    synopsis: P.text(p.Synopsis),
    productions: P.relation(p.Productions).map((id) => eventById[id]?.slug).filter(Boolean),
    body: await blocksHtml(await blocksOf(r.id)),
  });
}

console.log('pull: quotes');
const quotes = [];
for (const r of published(await queryAll(ids.ds.quotes))) {
  const p = r.properties;
  need(r, 'Quotes', ['Couplet', 'Translation', 'Attribution', 'Poet', 'Order', 'Status']);
  const couplet = P.title(p.Couplet).trim();
  if (!couplet) continue;
  quotes.push({
    id: r.id,
    couplet,
    translation: P.text(p.Translation),
    attribution: P.text(p.Attribution),
    poet: P.relation(p.Poet).map((id) => artistById[id]?.slug).filter(Boolean)[0] ?? '',
    order: P.number(p.Order) ?? 999,
  });
}
quotes.sort((a, b) => a.order - b.order);

// ── write ─────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const strip = (list) => list.map(({ id, ...rest }) => rest);
for (const [name, data] of Object.entries({ artists, songs, events, team, blog, scripts, quotes })) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(strip(data), null, 2) + '\n');
  console.log(`  ${name}: ${data.length}`);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ pulledAt: new Date().toISOString() }, null, 2) + '\n');
console.log('pull: done');
