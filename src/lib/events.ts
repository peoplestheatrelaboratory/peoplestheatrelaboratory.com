/**
 * Events accessor. Today this reads a JSON seed; it is the seam where the
 * Notion loader plugs in — the shape below mirrors the planned Events database.
 */
import raw from '../data/events.json';

export type Series = 'baithak' | 'ksr' | 'production' | 'workshop';

export interface SetlistItem {
  slug: string;
  title: string;
  poet: string;
}

export interface Event {
  slug: string;
  series: Series;
  title: string;
  titleDeva: string;
  /** ISO date, or null when the exact day is not on record. */
  date: string | null;
  tithi: string;
  venue: string;
  city: string;
  status: 'upcoming' | 'past';
  summary: string;
  registerUrl?: string;
  setlist: SetlistItem[];
}

export const SERIES: Record<Series, { label: string; deva: string; rhythm: string }> = {
  baithak: { label: 'Baithak', deva: 'बैठक', rhythm: 'monthly' },
  ksr: { label: 'Kabir Sang Ruhdaari', deva: 'कबीर संग रुहदारी', rhythm: 'every Jyestha Poornima' },
  production: { label: 'Production', deva: 'नाटक', rhythm: '' },
  workshop: { label: 'Workshop', deva: 'कार्यशाला', rhythm: '' },
};

const events = raw as Event[];

const byDateDesc = (a: Event, b: Event) =>
  (b.date ?? '0000').localeCompare(a.date ?? '0000');

export function getEvents(): Event[] {
  return [...events].sort(byDateDesc);
}

export function getUpcoming(): Event[] {
  return getEvents().filter((e) => e.status === 'upcoming').reverse();
}

export function getPast(): Event[] {
  return getEvents().filter((e) => e.status === 'past');
}

export function getEvent(slug: string): Event | undefined {
  return events.find((e) => e.slug === slug);
}

/** "Venue, City" — or just the city when that is all we know. */
export function formatPlace(e: Pick<Event, 'venue' | 'city'>): string {
  return e.venue && e.venue !== e.city ? `${e.venue}, ${e.city}` : e.city;
}

export function formatDate(iso: string | null, tithi: string): string {
  if (!iso) return tithi;
  const d = new Date(iso + 'T12:00:00Z');
  const s = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `${s} · ${tithi}`;
}
