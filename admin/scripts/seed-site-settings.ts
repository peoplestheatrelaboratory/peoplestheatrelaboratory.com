import { getPayload } from 'payload';
import config from '../src/payload.config';
import { defaultSiteSettings } from '../../shared/site-settings';
const payload = await getPayload({config});
try {
  const current = await payload.findGlobal({slug:'site-settings',depth:0,overrideAccess:true});
  if (current.createdAt) console.log('Site settings already exist; left unchanged.');
  else {
    const quotes = await payload.find({collection:'quotes',sort:'order',limit:1,depth:0,draft:false,where:{_status:{equals:'published'}}});
    const quote=quotes.docs[0];
    await payload.updateGlobal({slug:'site-settings',overrideAccess:true,context:{skipRevalidation:true},data:{...defaultSiteSettings,featuredEvent:null,...(quote?{couplet:quote.couplet,translation:quote.translation||'',attribution:quote.attribution}:{})}});
    console.log('Seeded homepage and footer from current website defaults.');
  }
} finally { await payload.destroy(); }
process.exit(0);
