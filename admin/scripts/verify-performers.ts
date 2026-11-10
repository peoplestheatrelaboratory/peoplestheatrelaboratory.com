import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from '../src/payload.config';
import { siteContent } from '../src/lib/site-content';
const payload = await getPayload({ config });
const user = (await payload.find({collection:'users',where:{role:{equals:'super-admin'}},limit:1})).docs[0];
const slug = `performer-check-${Date.now()}`;
let id: number | undefined;
const performers = [{name:'Test singer',part:'Vocals'},{name:'Test player',part:'Tabla & percussion'}];
try {
 const event = await payload.create({collection:'events',user,overrideAccess:false,draft:true,context:{skipRevalidation:true},data:{title:'Temporary performer check',slug,performers}}); id=event.id;
 assert.deepEqual(event.performers?.map(({name,part})=>({name,part})),performers);
 assert.equal((await siteContent(payload)).events.some(e=>e.slug===slug),false);
 await payload.update({collection:'events',id,user,overrideAccess:false,context:{skipRevalidation:true},data:{_status:'published'}});
 assert.deepEqual((await siteContent(payload)).events.find(e=>e.slug===slug)?.performers,performers);
 console.log('PASS performers persist, draft remains private, published projection includes event roles');
} finally {
 if(id) await payload.delete({collection:'events',id,overrideAccess:true,context:{skipRevalidation:true}});
 await payload.destroy();
}
process.exit(0);
