import { unstable_cache } from 'next/cache';
import { getPayload } from 'payload';
import config from '@payload-config';
import { siteSettingsSchema } from '../../../../../../shared/site-settings';
export const dynamic = 'force-dynamic';
const settings = unstable_cache(async () => {
  const payload = await getPayload({ config });
  // Public output is strictly allowlisted below; the raw global API stays private.
  const doc = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true });
  let featuredEvent = '';
  if (doc.featuredEvent) {
    const id = typeof doc.featuredEvent === 'object' ? doc.featuredEvent.id : doc.featuredEvent;
    const event = await payload.find({collection:'events',where:{id:{equals:id}},limit:1,depth:0,draft:false,overrideAccess:false,user:null});
    featuredEvent = event.docs[0]?.slug || '';
  }
  return siteSettingsSchema.parse({...doc, poster:doc.poster||'', featuredEvent,
    videoVariants:(doc.videoVariants||[]).map(v=>({minWidth:v.minWidth,mp4:v.mp4||'',webm:v.webm||''})),
    footerLinks:(doc.footerLinks||[]).map(v=>({label:v.label,detail:v.detail||'',href:v.href,newTab:Boolean(v.newTab)})),
  });
}, ['ptl-site-settings-v1'], { tags: ['ptl-site-settings', 'ptl-public-content'], revalidate: 2592000 });
export async function GET() { return Response.json(await settings(), {headers:{'Cache-Control':'no-store'}}); }
