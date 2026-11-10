import assert from 'node:assert/strict';
import { getPayload } from 'payload';
import config from '../src/payload.config';
const payload=await getPayload({config});
try {
 const user=(await payload.find({collection:'users',limit:1,where:{role:{equals:'super-admin'}}})).docs[0];
 assert(user,'A super admin is required');
 const before=await payload.findGlobal({slug:'site-settings',user,overrideAccess:false});
 for(const role of ['editor','contributor'] as const){
  const staff={...user,role,sections:['events' as const],canPublish:true};
  await assert.rejects(()=>payload.findGlobal({slug:'site-settings',user:staff,overrideAccess:false}));
  await assert.rejects(()=>payload.updateGlobal({slug:'site-settings',data:{heading:'Unauthorized change'},user:staff,overrideAccess:false,context:{skipRevalidation:true}}));
 }
 await assert.rejects(()=>payload.updateGlobal({slug:'site-settings',data:{heading:'Anonymous change'},user:null,overrideAccess:false,context:{skipRevalidation:true}}));
 await assert.rejects(()=>payload.updateGlobal({slug:'site-settings',data:{footerLinks:[{label:'Unsafe',href:'javascript:alert(1)'}]},user,overrideAccess:false,context:{skipRevalidation:true}}));
 const updated=await payload.updateGlobal({slug:'site-settings',data:{heading:before.heading},user,overrideAccess:false,context:{skipRevalidation:true}});
 assert.equal(updated.heading,before.heading);
 console.log('PASS super-admin settings access, editor/contributor/anonymous denial, unsafe link rejection');
}finally{await payload.destroy();}
process.exit(0);
