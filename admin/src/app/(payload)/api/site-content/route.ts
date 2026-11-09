import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';
import { siteContent } from '../../../../lib/site-content';

export const dynamic = 'force-dynamic';
const snapshot = unstable_cache(async () => siteContent(await getPayload({ config })),
  ['ptl-public-content-v3', process.env.ADMIN_URL || 'local'],
  { tags: ['ptl-public-content'], revalidate: 3600 });

export async function GET() {
  return Response.json(await snapshot(), { headers: { 'Cache-Control': 'no-store' } });
}
