/**
 * Merge the Notion export (owner's Master Library) with the lyrics harvested
 * from the two Canva microsites into one canonical dataset: content/library.json.
 *
 * Precedence: Notion properties win; Notion lyrics/meaning win when present,
 * else the harvest fills in. Conflicts are collected in `warnings`.
 *
 *   node scripts/notion/merge.mjs "<path to export>/Master Library"
 */
import fs from 'node:fs';
import path from 'node:path';

const EXPORT = process.argv[2];
if (!EXPORT) throw new Error('pass the export "Master Library" directory');

// ── helpers ──────────────────────────────────────────────────────────────
const read = (p) => fs.readFileSync(p, 'utf8');
const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const stripId = (name) => name.replace(/\s[0-9a-f]{32}(\.md|\.csv)?$/, '').replace(/\.md$/, '');
const warnings = [];

/** Parse a Notion page export: `# Title`, `Prop: value` lines, then sections. */
function parsePage(md) {
  const lines = md.split('\n');
  let i = 0;
  const title = lines[i++].replace(/^#\s*/, '').trim();
  // the title may wrap onto a second line (one export does)
  const props = {};
  let titleExtra = '';
  // a title with an unclosed "(" wraps onto the next line in the export
  if ((title.match(/\(/g) ?? []).length > (title.match(/\)/g) ?? []).length) titleExtra = ' ' + lines[i++].trim();
  const body = [];
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('#')) break;
    const m = l.match(/^([^:]{1,40}):\s(.*)$/);
    if (m && body.length === 0) props[m[1].trim()] = m[2].trim();
    else if (l.trim()) body.push(l.trim());
  }
  const rest = lines.slice(i).join('\n');
  const section = (name) => {
    const re = new RegExp(`###\\s*\\**${name}\\**\\s*\\n([\\s\\S]*?)(?=\\n###|$)`);
    const m = rest.match(re);
    return m ? m[1] : '';
  };
  const lyricsRaw = section('Lyrics');
  const aside = lyricsRaw.match(/<aside>\s*🎼?\s*([\s\S]*?)<\/aside>/);
  const lyrics = (aside ? aside[1] : lyricsRaw)
    .split('\n')
    .map((l) => l.replace(/^\*+|\*+$/g, '').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const meaning = section('Meaning')
    .split('\n')
    .map((l) => l.replace(/^>\s?/, '').trim())
    .join('\n')
    .trim();
  const references = [...section('References').matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map((m) => ({
    label: m[1],
    url: m[2],
  }));
  return { title: (title + titleExtra).replace(/\s+/g, ' ').trim(), props, body: body.join('\n'), lyrics, meaning, references };
}

/** "Kabir (Artist%20Library/Kabir%20<id>.md), Mira Bai (...)" → ["Kabir","Mira Bai"] */
const relNames = (v) =>
  v
    ? [...v.matchAll(/([^,(]+?)\s\((?:\.\.\/)?[A-Za-z%20]+\/[^)]*\)/g)].map((m) => m[1].trim())
    : [];

// ── artists ──────────────────────────────────────────────────────────────
const artistDir = path.join(EXPORT, 'Artist Library');
const artists = new Map(); // slug → artist
const DEVA = {
  Kabir: 'कबीर', 'Mira Bai': 'मीरा', 'Amir Khusrow': 'अमीर ख़ुसरो', Raidas: 'रैदास',
  'Bhaba Pagla': 'भाबा पागला', 'Ali Raja': 'अली राजा', 'Harji Bhati': 'हरजी भाटी',
  'Mir Mukhtiyar Ali': 'मीर मुख्तियार अली', 'Hardik Dave': 'हार्दिक दवे',
  'Devabhai Jagariya': 'देवाभाई जगरिया', 'Kabir Cafe': 'कबीर कैफ़े',
  'Abida Parveen': 'आबिदा परवीन', 'Nusrat Fateh Ali Khan': 'नुसरत फ़तेह अली ख़ान',
  'Fareed Ayaz & Abu Muhammad': 'फ़रीद अयाज़ और अबू मुहम्मद',
  'Bengali folk': 'बांग्ला लोकगीत', 'Rigveda': 'ऋग्वेद', 'Folk (Gujarati)': 'ગુજરાતી લોકગીત',
  'Folk (Rajasthani)': 'राजस्थानी लोकगीत',
};
const CANON = { 'Amir khusrow': 'Amir Khusrow' }; // fix casing from the export
function artist(name, role) {
  name = CANON[name] ?? name;
  const slug = slugify(name);
  const a = artists.get(slug) ?? { slug, name, nameDeva: DEVA[name] ?? '', roles: new Set(), note: '' };
  if (role) a.roles.add(role);
  artists.set(slug, a);
  return slug;
}
for (const f of fs.readdirSync(artistDir)) {
  const p = parsePage(read(path.join(artistDir, f)));
  artists.get(artist(p.title)).note = p.body;
}
// poets that only exist in the harvest
const POET = {
  कबीर: 'Kabir', मीरा: 'Mira Bai', रैदास: 'Raidas', 'भाबा पागला': 'Bhaba Pagla',
  'अली राजा': 'Ali Raja', 'ऋग्वेद की ऋचा': 'Rigveda', 'अमीर ख़ुसरो': 'Amir Khusrow',
  'Bengali Folk': 'Bengali folk', 'Harji Bhati': 'Harji Bhati', લોકગીત: 'Folk (Gujarati)',
  लोकगीत: 'Folk (Rajasthani)',
};

// ── harvest ──────────────────────────────────────────────────────────────
const harvestSrc = read('public/lyrics/songs.js').replace(/window\.\w+\s*=\s*/, '').replace(/;\s*$/, '');
const harvest = new Function(`return (${harvestSrc})`)();
// the KSR-2026 "jheeni-jheeni" and the Baithak "chadariya-jheeni" are the same song
const ALIAS = { 'jheeni-jheeni': 'chadariya-jheeni' };

// Notion export title → harvest key
const NOTION_TO_HARVEST = {
  'Sadho (साधो)': 'sadho',
  'Rahna Nahi Des Birana (रहना नहीं देस बिराना)': 'rahna-nahi-des',
  'Bhum Charkha': 'bhum-charkha',
  'Bheege Chunariya Prem Ras Boondan (भीगे चुनरिया, प्रेम रस बुंदन)': 'bheege-chunariya',
  'Sunta Nahi Dhun Ki Khabar (सुनता नहींधुन की खबर)': 'sunta-nahi-dhun',
  'Man Lago Mero Yaar Fakiri Me': 'man-lago-fakiri',
  'Chadariya Jheeni Re Jheeni': 'chadariya-jheeni',
  'Moko Kahaan Dhundhe Re Bande': 'moko-kahan',
  'Aari Gagan Ma': 'aari-gagan-ma',
  'Phagun Ke Din Char': 'phagun-ke-din-char',
  'Aj Rang Hai': 'aj-rang-hai',
  'Saro Sansariyo': 'saro-sansariyo',
  'Aisi Mhari Preet': 'aisi-mhari-preet',
  'Mara Nakh Na Parvada Jevi (મારા નખના પરવાળા જેવી)': 'mara-nakh-na',
};

// ── songs ────────────────────────────────────────────────────────────────
const songs = new Map(); // harvest key → song
const splitTitle = (t) => {
  const m = t.match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { latin: m[1].trim(), deva: m[2].replace(/\s+/g, ' ').trim() } : { latin: t.trim(), deva: '' };
};
const multi = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

const songDir = path.join(EXPORT, 'Songs Library');
for (const f of fs.readdirSync(songDir)) {
  const p = parsePage(read(path.join(songDir, f)));
  const key = NOTION_TO_HARVEST[p.title];
  if (!key) {
    if (p.title !== 'New Song') warnings.push(`Notion song not mapped: ${p.title}`);
    continue;
  }
  const h = harvest.songs[key];
  const t = splitTitle(p.title);
  const poets = relNames(p.props['✍️Original Writer']).map((n) => artist(n, 'Poet'));
  const singers = relNames(p.props['🎤Singers/Composers']).map((n) => artist(n, 'Singer / Composer'));
  const song = {
    slug: key,
    title: h?.title && /[ऀ-૿]/.test(h.title) ? h.title : t.deva || h?.title || t.latin,
    titleLatin: h?.titleLatin || t.latin,
    poets,
    singers,
    language: multi(p.props.Language),
    genre: multi(p.props.Genre),
    geography: multi(p.props.Geography),
    raag: p.props.Raag ?? '',
    lyrics: p.lyrics || h?.lyrics || '',
    meaning: p.meaning || h?.meaning || '',
    references: p.references,
    source: 'notion',
  };
  if (p.lyrics && h?.lyrics && p.lyrics.slice(0, 40) !== h.lyrics.slice(0, 40)) {
    warnings.push(`lyrics differ notion vs harvest: ${key} — kept Notion's`);
  }
  if (h?.writer && poets.length === 0) song.poets.push(artist(POET[h.writer] ?? h.writer, 'Poet'));
  songs.set(key, song);
}
// several Notion pages carry another song's verses pasted in place of their own
// (the first line of the body is that other song's title) — trust the harvest there
const titles = new Map([...songs.values()].map((s) => [s.title.replace(/[,।]/g, '').trim(), s.slug]));
for (const [key, s] of songs) {
  const first = s.lyrics.split('\n')[0]?.replace(/[,।]/g, '').trim();
  const owner = titles.get(first);
  if (owner && owner !== key) {
    s.lyrics = harvest.songs[key]?.lyrics ?? '';
    s.meaning = harvest.songs[key]?.meaning ?? '';
    warnings.push(`${key}: Notion page body held "${first}" (${owner}); replaced with harvest`);
  }
}
// songs only in the harvest
for (const [key, h] of Object.entries(harvest.songs)) {
  if (ALIAS[key] || songs.has(key)) continue;
  const poetName = POET[h.writer] ?? h.writer;
  songs.set(key, {
    slug: key,
    title: h.title,
    titleLatin: h.titleLatin ?? key.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '),
    poets: poetName ? [artist(poetName, 'Poet')] : [],
    singers: (h.singers ?? []).map((n) => artist(n, 'Singer / Composer')),
    language: h.language ? [h.language] : [],
    genre: h.genre ? [h.genre] : [],
    geography: h.geography ? [h.geography] : [],
    raag: '',
    lyrics: h.lyrics ?? '',
    meaning: h.meaning ?? '',
    references: [],
    source: 'canva',
  });
}
// default language: Devanagari lyrics → Hindi unless told otherwise
for (const s of songs.values()) {
  if (!s.language.length && /[ऀ-ॿ]/.test(s.lyrics + s.title)) s.language = ['Hindi'];
  if (!s.lyrics) warnings.push(`no lyrics anywhere: ${s.slug}`);
}

// ── events ───────────────────────────────────────────────────────────────
const events = [
  {
    slug: 'kabir-sang-ruhdaari-first',
    series: 'Kabir Sang Ruhdaari',
    title: 'Kabir Sang Ruhdaari — the first gathering',
    titleDeva: 'कबीर संग रुहदारी',
    date: null,
    tithi: 'Jyestha Poornima',
    venue: 'Kanoria Centre for Arts',
    city: 'Ahmedabad',
    summary: 'An earnest attempt to sit, breathe, and have a moment with ourselves, with art, and with the universe.',
    setlist: harvest.events.find((e) => e.slug === 'kabir-sang-roohdari').songs,
  },
  {
    slug: 'baithak-2026-02',
    series: 'Baithak',
    title: 'Baithak — Phag Poonam',
    titleDeva: 'बैठक',
    date: '2026-02-26',
    tithi: 'Phag Poonam',
    venue: '',
    city: 'Vadodara',
    summary: 'The monthly sitting — music, readings and work-in-progress in a small circle. Holi songs for the full moon of Phagun.',
    setlist: harvest.events.find((e) => e.slug === 'baithak-feb-2026').songs,
  },
  {
    slug: 'kabir-sang-ruhdaari-2026-vadodara',
    series: 'Kabir Sang Ruhdaari',
    title: 'Kabir Sang Ruhdaari 2026',
    titleDeva: 'कबीर संग रुहदारी २०२६',
    date: '2026-06-27',
    tithi: 'Jyestha Poornima',
    venue: 'MilanKunj Club, Alkapuri',
    city: 'Vadodara',
    summary: 'A room of nearly four hundred people singing along while painters worked at the edge of the stage.',
    setlist: harvest.events.find((e) => e.slug === 'ruhdaari-2026-vadodara').songs,
  },
].map((e) => ({ ...e, setlist: e.setlist.map((k) => ALIAS[k] ?? k) }));
warnings.push('baithak-2026-02: Notion says 28 Feb 2026, its own name and the Canva site say 26 Feb — kept 26; confirm with owner');

const out = {
  generatedFrom: { notionExport: path.basename(EXPORT), harvest: 'public/lyrics/songs.js' },
  artists: [...artists.values()].map((a) => ({ ...a, roles: [...a.roles] })),
  songs: [...songs.values()],
  events,
  warnings,
};
fs.mkdirSync('content', { recursive: true });
fs.writeFileSync('content/library.json', JSON.stringify(out, null, 2) + '\n');
console.log(`artists ${out.artists.length}, songs ${out.songs.length}, events ${out.events.length}`);
for (const w of warnings) console.log('!', w);
