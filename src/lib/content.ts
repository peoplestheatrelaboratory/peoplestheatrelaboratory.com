/**
 * Site content, read from the Notion snapshot in content/site/*.json.
 * `scripts/notion/pull.mjs` refreshes those files before every build that has
 * a NOTION_TOKEN; without one the committed snapshot is used.
 */
import artistsRaw from '../../content/site/artists.json';
import songsRaw from '../../content/site/songs.json';
import eventsRaw from '../../content/site/events.json';
import teamRaw from '../../content/site/team.json';
import blogRaw from '../../content/site/blog.json';
import scriptsRaw from '../../content/site/scripts.json';

export interface Artist {
  slug: string;
  name: string;
  nameDeva: string;
  roles: string[];
  era: string;
  note: string; // html
}

export interface Reference {
  label: string;
  url: string;
}

export interface Song {
  slug: string;
  title: string;
  titleLatin: string;
  poets: string[];
  singers: string[];
  language: string[];
  genre: string[];
  geography: string[];
  raag: string;
  lyrics: string[]; // stanzas
  meaning: string;
  references: Reference[];
}

export type Series = 'Baithak' | 'Kabir Sang Ruhdaari' | 'Production' | 'Workshop' | '';

export interface Event {
  slug: string;
  title: string;
  titleDeva: string;
  series: Series;
  date: string | null;
  tithi: string;
  venue: string;
  city: string;
  summary: string;
  registerUrl: string;
  cover: string;
  setlist: string[];
  artists: string[];
  body: string; // html
}

export interface TeamMember {
  slug: string;
  name: string;
  nameDeva: string;
  role: string;
  order: number;
  photo: string;
  socials: string;
  bio: string; // html
}

export interface Post {
  slug: string;
  title: string;
  date: string | null;
  authors: string[];
  excerpt: string;
  cover: string;
  tags: string[];
  relatedEvent: string;
  body: string; // html
}

export interface Script {
  slug: string;
  title: string;
  titleDeva: string;
  playwrights: string[];
  language: string[];
  year: number | null;
  file: string;
  synopsis: string;
  productions: string[];
  body: string; // html
}

export const artists = artistsRaw as Artist[];
export const songs = songsRaw as Song[];
export const events = eventsRaw as Event[];
export const team = teamRaw as TeamMember[];
export const posts = blogRaw as Post[];
export const scripts = scriptsRaw as Script[];

const index = <T extends { slug: string }>(list: T[]) => new Map(list.map((x) => [x.slug, x]));
const artistIx = index(artists);
const songIx = index(songs);
const eventIx = index(events);

export const getArtist = (slug: string) => artistIx.get(slug);
export const getSong = (slug: string) => songIx.get(slug);
export const getEvent = (slug: string) => eventIx.get(slug);
export const getPost = (slug: string) => posts.find((p) => p.slug === slug);
export const getScript = (slug: string) => scripts.find((s) => s.slug === slug);

/** Songs of an artist, as poet or performer. */
export const songsByArtist = (slug: string) =>
  songs.filter((s) => s.poets.includes(slug) || s.singers.includes(slug));

/** Events where a song was sung, newest first. */
export const eventsForSong = (slug: string) =>
  eventsSorted().filter((e) => e.setlist.includes(slug));

// ── events helpers (kept from the JSON-seed era) ──────────────────────────
const TODAY = new Date().toISOString().slice(0, 10);

export function eventsSorted(): Event[] {
  return [...events].sort((a, b) => (b.date ?? '0000').localeCompare(a.date ?? '0000'));
}

/** Dated today or later, soonest first. */
export function upcomingEvents(): Event[] {
  return eventsSorted().filter((e) => e.date && e.date >= TODAY).reverse();
}

export function pastEvents(): Event[] {
  return eventsSorted().filter((e) => !e.date || e.date < TODAY);
}

export const isUpcoming = (e: Event) => !!e.date && e.date >= TODAY;

export const SERIES: Record<string, { label: string; deva: string; rhythm: string }> = {
  Baithak: { label: 'Baithak', deva: 'बैठक', rhythm: 'monthly' },
  'Kabir Sang Ruhdaari': { label: 'Kabir Sang Ruhdaari', deva: 'कबीर संग रुहदारी', rhythm: 'every Jyestha Poornima' },
  Production: { label: 'Production', deva: 'नाटक', rhythm: '' },
  Workshop: { label: 'Workshop', deva: 'कार्यशाला', rhythm: '' },
  '': { label: 'Gathering', deva: '', rhythm: '' },
};

export const seriesOf = (e: Event) => SERIES[e.series] ?? SERIES[''];

/** "Venue, City" — or just the city when that is all we know. */
export function formatPlace(e: Pick<Event, 'venue' | 'city'>): string {
  return e.venue && e.venue !== e.city ? `${e.venue}, ${e.city}` : e.city;
}

export function formatDate(iso: string | null, tithi = ''): string {
  if (!iso) return tithi;
  const d = new Date(iso + 'T12:00:00Z');
  const s = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return tithi ? `${s} · ${tithi}` : s;
}

/**
 * Stanzas for display. Notion stores one paragraph per line for songs typed in
 * by hand, and one paragraph per stanza (lines joined with \n) for imported
 * ones — so runs of single lines are folded into one stanza here.
 */
export function stanzas(song: Song): string[] {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => { if (run.length) { out.push(run.join('\n')); run = []; } };
  for (const p of song.lyrics) {
    if (p.includes('\n')) { flush(); out.push(p); }
    else if (p.trim() === '') flush();
    else run.push(p);
  }
  flush();
  return out;
}

/** Poets of a song as display names, e.g. "Kabir" or "Kabir · Mira Bai". */
export const poetNames = (s: Song) =>
  s.poets.map((p) => getArtist(p)?.name ?? p).join(' · ');
