import {describe,expect,test} from 'bun:test';
import {chooseVideoVariant,defaultSiteSettings,safeLink,safeAsset,siteSettingsSchema,homepageQuotes,heroQuoteSchema} from '../shared/site-settings';
import {revalidationPaths} from '../shared/revalidation';
describe('site settings',()=>{
 test('default settings satisfy public contract',()=>expect(siteSettingsSchema.parse(defaultSiteSettings)).toEqual(defaultSiteSettings));
 test('homepage quotes accept missing translations and attributions, but reject blank quotes',()=>{
  expect(heroQuoteSchema.parse({couplet:' A quote '})).toEqual({couplet:'A quote',translation:'',attribution:''});
  expect(heroQuoteSchema.parse({couplet:'A quote',translation:null,attribution:'  '})).toEqual({couplet:'A quote',translation:'',attribution:''});
  expect(heroQuoteSchema.safeParse({couplet:'   '}).success).toBe(false);
 });
 test('older cached settings keep the original quote until a list is saved',()=>{
  const {heroQuotes,...legacy}=defaultSiteSettings;
  const settings=siteSettingsSchema.parse({...legacy,couplet:'Saved quote',translation:'',attribution:''});
  expect(settings.heroQuotes).toEqual([]);
  expect(homepageQuotes(settings)).toEqual([{couplet:'Saved quote',translation:'',attribution:''}]);
  const quotes=[{couplet:'First',translation:'',attribution:''},{couplet:'Second',translation:'Translation',attribution:'Author'}];
  expect(homepageQuotes({...settings,heroQuotes:quotes})).toEqual(quotes);
  expect(homepageQuotes({...settings,couplet:''})).toEqual(defaultSiteSettings.heroQuotes);
 });
 test('video sources select the largest fitting screen without mutating saved order',()=>{
  const variants=[{minWidth:1280,mp4:'desktop',webm:''},{minWidth:0,mp4:'mobile',webm:''},{minWidth:768,mp4:'tablet',webm:''}];
  expect(chooseVideoVariant(variants,390)?.mp4).toBe('mobile');expect(chooseVideoVariant(variants,1024)?.mp4).toBe('tablet');expect(chooseVideoVariant(variants,1600)?.mp4).toBe('desktop');expect(variants[0].minWidth).toBe(1280);
 });
 test('unsafe URLs cannot be rendered as links or video sources',()=>{
  for(const link of ['javascript:alert(1)','//evil.example','/\\evil.example','data:text/html,hi',' https://example.com']){expect(safeLink(link)).toBe(false);expect(safeAsset(link)).toBe(false);}
  for(const link of ['/events/','https://example.com/test.mp4'])expect(safeAsset(link)).toBe(true);
  expect(safeLink('mailto:test@example.com')).toBe(true);expect(safeAsset('mailto:test@example.com')).toBe(false);
 });
 test('settings refresh includes the homepage and contact footer',()=>{
  const paths=revalidationPaths({collection:'site-settings',documents:[]},{events:[]});expect(paths).toContain('/');expect(paths).toContain('/contact/');
 });
});

test('cache refresh webhook rejects unauthenticated and malformed requests before fetching content',async()=>{
 const {POST}=await import('../api/revalidate');
 const original=process.env.ISR_BYPASS_TOKEN;
 process.env.ISR_BYPASS_TOKEN='test-webhook-secret';
 try {
  expect((await POST(new Request('https://example.com/api/revalidate',{method:'POST'}))).status).toBe(401);
  expect((await POST(new Request('https://example.com/api/revalidate',{method:'POST',headers:{Authorization:'Bearer test-webhook-secret','Content-Type':'application/json'},body:JSON.stringify({collection:'users',documents:[]})}))).status).toBe(400);
 }finally{if(original===undefined)delete process.env.ISR_BYPASS_TOKEN;else process.env.ISR_BYPASS_TOKEN=original;}
});
