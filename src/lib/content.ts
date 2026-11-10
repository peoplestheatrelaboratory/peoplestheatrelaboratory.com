/** Published CMS content, with a snapshot mode for an unconfigured local checkout. */
import artistsRaw from '../../content/site/artists.json';
import songsRaw from '../../content/site/songs.json';
import eventsRaw from '../../content/site/events.json';
import teamRaw from '../../content/site/team.json';
import blogRaw from '../../content/site/blog.json';
import scriptsRaw from '../../content/site/scripts.json';
import quotesRaw from '../../content/site/quotes.json';

import type { Artist, Song, Event, TeamMember, Post, Script, Quote, MediaInfo } from '../../shared/content-types';
import type { SiteSettings } from '../../shared/site-settings';
export type { Artist, Song, Event, TeamMember, Post, Script, Quote } from '../../shared/content-types';
import { contentSchema } from '../../shared/content-schema';
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

/** Check if text contains Gujarati characters */
export const isGujarati = (text = '') => /[\u0A80-\u0AFF]/.test(text);

/** Check if text contains Devanagari characters */
export const isDevanagari = (text = '') => /[\u0900-\u097F]/.test(text);

/** Detect appropriate lang code: gu, hi, bn, pa, or en */
export function songLang(song: Song): string {
  if (song.language?.some((l) => /gujarati/i.test(l)) || isGujarati(song.title) || song.lyrics.some(isGujarati)) return 'gu';
  if (song.language?.some((l) => /bengali/i.test(l))) return 'bn';
  if (song.language?.some((l) => /punjabi/i.test(l))) return 'pa';
  if (isDevanagari(song.title) || song.lyrics.some(isDevanagari)) return 'hi';
  return 'en';
}

/** BCP 47 code for a run of text, or undefined when it is plain Latin (the page language). */
export const textLang = (text = ''): 'gu' | 'hi' | undefined =>
  isGujarati(text) ? 'gu' : isDevanagari(text) ? 'hi' : undefined;

/** CSS class for proper font family */
export function scriptClass(text = ''): string {
  if (isGujarati(text)) return 'guj';
  if (isDevanagari(text)) return 'deva';
  return '';
}

export const snapshotContent = { artists: artistsRaw, songs: songsRaw, events: eventsRaw, team: teamRaw, posts: blogRaw, scripts: scriptsRaw, quotes: quotesRaw };
export type SiteContent = { artists: Artist[]; songs: Song[]; events: Event[]; team: TeamMember[]; posts: Post[]; scripts: Script[]; quotes: Quote[]; media?: Record<string, MediaInfo> };
export function createContent(snapshot: SiteContent, now = new Date()) {
const artists = snapshot.artists;
const songs = snapshot.songs;
const events = snapshot.events;
const team = snapshot.team;
const posts = snapshot.posts;
const scripts = snapshot.scripts;
const quotes = snapshot.quotes;

/** The couplet on the homepage hero: lowest Order among published quotes. */
const heroQuote = (): Quote | undefined => quotes[0];

const index = <T extends { slug: string }>(list: T[]) => new Map(list.map((x) => [x.slug, x]));
const artistIx = index(artists);
const songIx = index(songs);
const eventIx = index(events);

const getArtist = (slug: string) => artistIx.get(slug);
const getSong = (slug: string) => songIx.get(slug);
const getEvent = (slug: string) => eventIx.get(slug);
const getPost = (slug: string) => posts.find((p) => p.slug === slug);
const getScript = (slug: string) => scripts.find((s) => s.slug === slug);

/** Songs of an artist, as poet or performer. */
const songsByArtist = (slug: string) =>
  songs.filter((s) => s.poets.includes(slug) || s.singers.includes(slug));

/** Events where a song was sung, newest first. */
const eventsForSong = (slug: string) =>
  eventsSorted().filter((e) => e.setlist.includes(slug));

// ── events helpers (kept from the JSON-seed era) ──────────────────────────
const TODAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

function eventsSorted(): Event[] {
  return [...events].sort((a, b) => (b.date ?? '0000').localeCompare(a.date ?? '0000'));
}

/** Dated today or later, soonest first. */
function upcomingEvents(): Event[] {
  return eventsSorted().filter((e) => e.date && e.date >= TODAY).reverse();
}

function pastEvents(): Event[] {
  return eventsSorted().filter((e) => !e.date || e.date < TODAY);
}

const isUpcoming = (e: Event) => !!e.date && e.date >= TODAY;

/** Newest first — the pull keeps Notion's created-time order. */
const recentSongs = (n = 10) => songs.slice(0, n);
const recentScripts = (n = 10) => scripts.slice(0, n);
const recentPosts = (n = 10) => posts.slice(0, n);

/** Poets of a song as display names, e.g. "Kabir" or "Kabir · Mira Bai". */
const poetNames = (s: Song) =>
  s.poets.map((p) => getArtist(p)?.name ?? p).join(' · ');

/**
 * Attributes for an uploaded image: the description its uploader wrote, and its
 * intrinsic size so the page does not shift when it arrives.
 */
const imageAttrs = (url: string) => {
  const info = snapshot.media?.[url];
  return { alt: info?.alt ?? '', width: info?.width ?? undefined, height: info?.height ?? undefined };
};

/** The gathering the home page leads with, or undefined when there is none to show. */
const featuredGathering = (settings: Pick<SiteSettings, 'gatheringMode' | 'featuredEvent'>): Event | undefined => {
  if (settings.gatheringMode === 'hidden') return undefined;
  if (settings.gatheringMode === 'selected') return getEvent(settings.featuredEvent);
  return upcomingEvents()[0] ?? pastEvents()[0];
};


return { artists, songs, events, team, posts, scripts, quotes, heroQuote, getArtist, getSong, getEvent, getPost, getScript, songsByArtist, eventsForSong, eventsSorted, upcomingEvents, pastEvents, isUpcoming, recentSongs, recentScripts, recentPosts, poetNames, imageAttrs, featuredGathering };
}

// One promise per Astro request, never a process-global snapshot or draft cache.
const requests = new WeakMap<object, Promise<ReturnType<typeof createContent>>>();
export function getContent(request: object) {
  let result = requests.get(request);
  if (!result) {
    result = loadContent().then(data => createContent(data));
    requests.set(request, result);
  }
  return result;
}
export async function loadContent(): Promise<SiteContent> {
  const base = process.env.CMS_URL || import.meta.env.CMS_URL;
  if (!base) return contentSchema.parse(snapshotContent);
  const response = await fetch(new URL('/api/site-content', base), { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`CMS content unavailable: HTTP ${response.status}`);
  // Never silently resurrect the old snapshot after a deletion/unpublish or outage.
  return contentSchema.parse(await response.json());
}
