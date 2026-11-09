import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import type { GlobalConfig, Field } from 'payload';
import { isSuper } from '../lib/permissions';
import { notifyWebsite } from '../lib/publishing';
import { safeAsset, safeLink } from '../../../shared/site-settings';
const text = (name: string, label: string) => ({ name, label, type: 'text' as const, required: true });
const asset = (name: string, label: string): Field => ({ name, label, type: 'text', validate: (value: unknown) => typeof value !== 'string' || safeAsset(value) || 'Use an HTTPS URL or a site path beginning with /.' });
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings', label: 'Homepage & footer',
  admin: { group: 'Settings', hidden: ({ user }) => !isSuper(user), description: 'Super admins only. Saving updates the website. Settings are cached for 30 days and refreshed when you save.' },
  access: { read: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) },
  hooks: { afterChange: [({ doc, req }) => {
    if (!req.context.skipRevalidation) {
      // Expire data during the request, before after() refreshes public pages.
      // Tags expired inside after() only flush once that callback finishes.
      revalidateTag('ptl-site-settings', { expire: 0 });
      after(() => notifyWebsite(req, 'site-settings', []));
    }
    return doc;
  }] },
  fields: [{ type: 'tabs', tabs: [
    { label: 'Homepage', fields: [text('heading', 'Page heading'), {name:'description',label:'Search description',type:'textarea',required:true}, {name:'couplet',label:'Hero quote',type:'textarea',required:true}, text('translation','Quote translation'), text('attribution','Quote attribution')] },
    { label: 'Background video', fields: [asset('poster','Poster image URL'), {name:'videoVariants',type:'array',label:'Video sizes',minRows:1,required:true,admin:{description:'Add a default size with minimum width 0. Add larger versions for tablet or desktop (e.g. 768 or 1280). Use existing /media/ paths or HTTPS file URLs. Uploading/transcoding videos is not enabled.'}, validate:(value:unknown)=>Array.isArray(value)&&value.some((v:any)=>v.minWidth===0&&(v.mp4||v.webm))&&new Set(value.map((v:any)=>v.minWidth)).size===value.length||'Include a default video at width 0 and use unique widths.',fields:[{name:'minWidth',label:'Minimum screen width (pixels)',type:'number',required:true,min:0,max:7680,defaultValue:0},asset('mp4','MP4 video URL'),asset('webm','WebM video URL')]}] },
    { label: 'Next gathering', fields: [{name:'gatheringMode',label:'Which gathering to show',type:'select',required:true,defaultValue:'automatic',options:[{label:'Automatic — next published event (or latest past event)',value:'automatic'},{label:'Choose a published event',value:'selected'},{label:'Hide this section',value:'hidden'}]}, {name:'featuredEvent',label:'Featured event',type:'relationship',relationTo:'events',filterOptions:{_status:{equals:'published'}},admin:{condition:(_,data)=>data.gatheringMode==='selected',description:'Only published events appear on the website.'}}, text('nextLabel','Upcoming gathering label'),text('pastLabel','Past gathering label'),text('bookingLabel','Registration button text'),text('detailsLabel','Past event button text'),text('phone','Contact phone (display)'),{...text('phoneHref','Phone link'),validate:(value:unknown)=>typeof value==='string'&&/^tel:\+?[0-9 -]+$/.test(value)||'Use a phone link such as tel:+919824010483.'}] },
    { label: 'Footer', fields: [text('footerHeading','Footer heading'),text('copyrightName','Copyright name'),{name:'footerLinks',label:'Footer links',type:'array',fields:[text('label','Link label'),{name:'detail',label:'Handle or description',type:'text'},{...text('href','Link address'),validate:(value:unknown)=>typeof value==='string'&&safeLink(value)||'Use HTTPS, mailto:, tel:, or a site path beginning with /.'},{name:'newTab',label:'Open in a new tab',type:'checkbox',defaultValue:true}]}] },
  ]}],
};
