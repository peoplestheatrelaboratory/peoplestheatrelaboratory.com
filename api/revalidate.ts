import { timingSafeEqual } from 'node:crypto';
import { contentSchema } from '../shared/content-schema.js';
import { revalidationPaths } from '../shared/revalidation.js';
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.ISR_BYPASS_TOKEN;
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') || '';
  if (!secret || Buffer.byteLength(given) !== Buffer.byteLength(secret) || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) return new Response('Unauthorized', { status: 401 });
  const change = await request.json().catch(() => null);
  if (!change || !['events','songs','scripts','artists','blog','quotes','team','media','site-settings'].includes(change.collection) || !Array.isArray(change.documents) || change.documents.length > 2 || change.documents.some((doc: unknown) => !doc || typeof doc !== 'object' || ('slug' in doc && typeof doc.slug !== 'string'))) return new Response('Invalid change', { status: 400 });
  const cms = process.env.CMS_URL;
  if (!cms) return new Response('CMS_URL is required', { status: 503 });
  const response = await fetch(new URL('/api/site-content', cms), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) return new Response('Content unavailable', { status: 502 });
  const content = contentSchema.parse(await response.json());
  const paths = new Set(revalidationPaths(change, content));
  // Relationships affect artist/song/post detail pages too. This small site can
  // refresh all published routes; no private paths are ever eligible.
  for (const a of content.artists) paths.add(`/library/artists/${a.slug}/`);
  for (const s of content.songs) paths.add(`/library/songs/${s.slug}/`);
  for (const s of content.scripts) paths.add(`/library/scripts/${s.slug}/`);
  for (const p of content.posts) paths.add(`/blog/${p.slug}/`);
  const base = process.env.SITE_URL;
  if (!base) return new Response('SITE_URL is required', { status: 503 });
  const failures: string[] = [];
  const list = [...paths];
  for (let offset = 0; offset < list.length; offset += 10) {
    await Promise.all(list.slice(offset, offset + 10).map(async path => {
      try {
        const res = await fetch(new URL(path, base), { method: 'HEAD', headers: { 'x-prerender-revalidate': secret }, signal: AbortSignal.timeout(10000), redirect: 'manual' });
        if (!res.ok && res.status !== 404) failures.push(path);
      } catch { failures.push(path); }
    }));
  }
  return Response.json({ refreshed: list.length - failures.length, failures }, { status: failures.length ? 502 : 200, headers: { 'Cache-Control': 'no-store' } });
};
