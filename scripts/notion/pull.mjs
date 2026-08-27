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
  date: (p) => p?.date?.start ?? null,
  checkbox: (p) => !!p?.checkbox,
  url: (p) => p?.url ?? '',
  number: (p) => p?.number ?? null,
  relation: (p) => (p?.relation ?? []).map((r) => r.id),
  files: (p) => (p?.files ?? []).map((f) => ({ name: f.name, url: f.type === 'file' ? f.file.url : f.external?.url })),
};

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
for (const r of published(artistRows)) {
  const p = r.properties;
  artists.push({
    id: r.id,
    slug: P.text(p.Slug),
    name: P.title(p.Name),
    nameDeva: P.text(p['Name (Devanagari)']),
    roles: P.multi(p.Role),
    era: P.text(p['Era / Region']),
    note: await blocksHtml(await blocksOf(r.id)),
  });
}
const artistById = byId(artists);

console.log('pull: songs');
const songRows = await queryAll(ids.ds.songs);
const songs = [];
for (const r of published(songRows)) {
  const p = r.properties;
  const body = await songBody(await blocksOf(r.id));
  songs.push({
    id: r.id,
    slug: P.text(p.Slug),
    title: P.title(p.Title),
    titleLatin: P.text(p['Title (Latin)']),
    poets: P.relation(p.Poet).map((id) => artistById[id]?.slug).filter(Boolean),
    singers: P.relation(p['Singers / Composers']).map((id) => artistById[id]?.slug).filter(Boolean),
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
for (const r of published(eventRows)) {
  const p = r.properties;
  const cover = P.files(p.Cover)[0];
  const blocks = await blocksOf(r.id);
  events.push({
    id: r.id,
    slug: P.text(p.Slug),
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
    setlist: P.relation(p.Setlist).map((id) => songById[id]?.slug).filter(Boolean),
    artists: P.relation(p.Artists).map((id) => artistById[id]?.slug).filter(Boolean),
    body: await blocksHtml(blocks),
  });
}
const eventById = byId(events);

console.log('pull: team');
const team = [];
for (const r of published(await queryAll(ids.ds.team))) {
  const p = r.properties;
  const photo = P.files(p.Photo)[0];
  team.push({
    id: r.id,
    slug: P.text(p.Slug),
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
for (const r of published(await queryAll(ids.ds.blog))) {
  const p = r.properties;
  const cover = P.files(p.Cover)[0];
  blog.push({
    id: r.id,
    slug: P.text(p.Slug),
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
for (const r of published(await queryAll(ids.ds.scripts))) {
  const p = r.properties;
  const file = P.files(p.File)[0];
  scripts.push({
    id: r.id,
    slug: P.text(p.Slug),
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

// ── write ─────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const strip = (list) => list.map(({ id, ...rest }) => rest);
for (const [name, data] of Object.entries({ artists, songs, events, team, blog, scripts })) {
  fs.writeFileSync(path.join(OUT, `${name}.json`), JSON.stringify(strip(data), null, 2) + '\n');
  console.log(`  ${name}: ${data.length}`);
}
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ pulledAt: new Date().toISOString() }, null, 2) + '\n');
console.log('pull: done');
