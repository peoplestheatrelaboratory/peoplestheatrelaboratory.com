import type { APIRoute } from 'astro';

/** The content studio runs in its own application, including during development. */
export const GET: APIRoute = ({ params, url }) => {
  const origin = process.env.CMS_URL || import.meta.env.CMS_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : 'https://admin.peoplestheatrelaboratory.com');
  const path = params.path ? `${params.path.replace(/\/+$/, '')}/` : '';
  const destination = new URL(`/admin/${path}`, origin);
  destination.search = url.search;
  return new Response(null, {
    status: 302,
    headers: {
      Location: destination.href,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};
