/** Every published page, built from the same content the pages render from. */
import type { APIRoute } from 'astro';
import { getContent } from '../lib/content';
import { SITE } from '../consts';

export const GET: APIRoute = async ({ locals }) => {
  const { events, songs, artists, scripts, posts } = await getContent(locals);
  const paths = [
    '/', '/events/', '/library/', '/library/songs/', '/library/scripts/', '/blog/', '/about/', '/contact/',
    ...events.flatMap((e) => [`/events/${e.slug}/`, ...(e.setlist.length ? [`/events/${e.slug}/lyrics/`] : [])]),
    ...songs.map((s) => `/library/songs/${s.slug}/`),
    ...artists.map((a) => `/library/artists/${a.slug}/`),
    ...scripts.map((s) => `/library/scripts/${s.slug}/`),
    ...posts.map((p) => `/blog/${p.slug}/`),
  ];
  // Slugs are restricted to [a-z0-9-] by the content schema, so no XML escaping is needed.
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((path) => `  <url><loc>${new URL(path, SITE.url).href}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
