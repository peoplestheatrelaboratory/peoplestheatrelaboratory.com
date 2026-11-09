import type { Event } from './content-types';
export type Change = { collection: string; documents: { slug?: string }[] };
export function revalidationPaths(change: Change, content: { events: Event[]; songs?: { slug: string }[] }) {
  const paths = new Set(['/','/events/','/library/','/library/songs/','/library/scripts/','/blog/','/about/','/contact/']);
  const prefixes: Record<string,string> = { events: '/events/', songs: '/library/songs/', scripts: '/library/scripts/', artists: '/library/artists/', blog: '/blog/' };
  for (const doc of change.documents) {
    if (!doc.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) continue;
    if (prefixes[change.collection]) paths.add(`${prefixes[change.collection]}${doc.slug}/`);
    if (change.collection === 'events') {
      paths.add(`/events/${doc.slug}/lyrics/`);
      for (const song of content.songs || []) paths.add(`/events/${doc.slug}/lyrics/${song.slug}/`);
    }
  }
  // All event songbooks depend on library edits and can contain renamed/deleted songs.
  for (const e of content.events) {
    paths.add(`/events/${e.slug}/`); paths.add(`/events/${e.slug}/lyrics/`);
    for (const song of e.setlist) paths.add(`/events/${e.slug}/lyrics/${song}/`);
    if (change.collection === 'songs') for (const doc of change.documents) if (doc.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) paths.add(`/events/${e.slug}/lyrics/${doc.slug}/`);
  }
  return [...paths];
}
