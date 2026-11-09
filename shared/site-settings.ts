import { z } from 'zod';
// Disallow protocol-relative URLs, script schemes, whitespace and backslashes.
export const safeLink = (value: string) => !/[\s\\]/.test(value) && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value) || /^(mailto:|tel:)/.test(value));
export const safeAsset = (value: string) => !value || (safeLink(value) && !/^(mailto:|tel:)/.test(value));
const asset = z.string().refine(safeAsset);
export const siteSettingsSchema = z.object({
  heading: z.string(), description: z.string(),
  couplet: z.string(), translation: z.string(), attribution: z.string(),
  poster: asset,
  videoVariants: z.array(z.object({ minWidth: z.number().min(0), mp4: asset, webm: asset })),
  gatheringMode: z.enum(['automatic', 'selected', 'hidden']), featuredEvent: z.string(),
  nextLabel: z.string(), pastLabel: z.string(), bookingLabel: z.string(), detailsLabel: z.string(),
  phone: z.string(), phoneHref: z.string().refine(v => /^tel:\+?[0-9 -]+$/.test(v)),
  footerHeading: z.string(), copyrightName: z.string(),
  footerLinks: z.array(z.object({ label: z.string(), detail: z.string(), href: z.string().refine(safeLink), newTab: z.boolean() })),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const defaultSiteSettings: SiteSettings = {
  heading: 'Peoples Theatre Laboratory — Vadodara. Home of Baithak and Kabir Sang Ruhdaari.',
  description: 'Peoples Theatre Laboratory, Vadodara. Home of Baithak and Kabir Sang Ruhdaari.',
  couplet: 'मोको कहाँ ढूंढे बन्दे, मैं तो तेरे पास में।',
  translation: 'Where do you search for me? I am right beside you.', attribution: 'Kabir',
  poster: '/media/hero-poster.jpg', videoVariants: [{minWidth: 0, mp4: '/media/hero-mobile.mp4', webm: '/media/hero-mobile.webm'}, {minWidth: 768, mp4: '/media/hero.mp4', webm: '/media/hero.webm'}],
  gatheringMode: 'automatic', featuredEvent: '', nextLabel: 'Next gathering', pastLabel: 'Last gathering', bookingLabel: 'Book a seat →', detailsLabel: 'What was sung →',
  phone: '+91 98240 10483', phoneHref: 'tel:+919824010483', footerHeading: 'Find us', copyrightName: 'Peoples Theatre Laboratory',
  footerLinks: [
    {label: 'Instagram', detail: '@peoplestheatrelaboratory', href: 'https://www.instagram.com/peoplestheatrelaboratory/', newTab: true},
    {label: 'Instagram — KSR', detail: '@kabirsangruhdaari.ptl', href: 'https://www.instagram.com/kabirsangruhdaari.ptl/', newTab: true},
    {label: 'Facebook', detail: '/ptlvadodara', href: 'https://www.facebook.com/ptlvadodara/', newTab: true},
  ],
};
export { chooseVideoVariant } from './video';
