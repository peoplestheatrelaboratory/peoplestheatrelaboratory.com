import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

async function notify(req: Parameters<CollectionAfterChangeHook>[0]['req'], collection: string, documents: unknown[]) {
  if (req.context.skipRevalidation) return;
  revalidateTag('ptl-public-content', { expire: 0 });
  if (!process.env.SITE_URL || !process.env.ISR_BYPASS_TOKEN) return;
  try {
    const response = await fetch(new URL('/api/revalidate/', process.env.SITE_URL), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ISR_BYPASS_TOKEN}` },
      body: JSON.stringify({ collection, documents }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    // Saving content remains successful; timed ISR retries reading current content.
    req.payload.logger.error({ err: error, msg: 'Public cache refresh failed; the five-minute fallback remains active.' });
  }
}
export const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, collection }) => {
  if (collection.slug === 'media' || doc._status === 'published' || previousDoc?._status === 'published') !req.context.skipRevalidation && after(() => notify(req, collection.slug, [doc, previousDoc].filter(Boolean).map(({ slug }) => slug ? { slug } : {})));
  return doc;
};
export const afterDelete: CollectionAfterDeleteHook = async ({ doc, req, collection }) => {
  if (collection.slug === 'media' || doc._status === 'published') !req.context.skipRevalidation && after(() => notify(req, collection.slug, doc.slug ? [{ slug: doc.slug }] : []));
  return doc;
};
