import { z } from 'zod';
// Disallow protocol-relative URLs, script schemes, whitespace and backslashes.
export const safeLink = (value: string) => !/[\s\\]/.test(value) && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value) || /^(mailto:|tel:)/.test(value));
export const safeAsset = (value: string) => !value || (safeLink(value) && !/^(mailto:|tel:)/.test(value));
const asset = z.string().refine(safeAsset);
export const heroQuoteSchema = z.object({
  couplet: z.string().trim().min(1),
  translation: z.string().nullish().transform(value => value?.trim() || ''),
  attribution: z.string().nullish().transform(value => value?.trim() || ''),
});
export type HeroQuote = z.infer<typeof heroQuoteSchema>;
export const siteSettingsSchema = z.object({
  heading: z.string(), description: z.string(),
  // Keep legacy settings readable during the rollout and for older cached feeds.
  couplet: z.string().nullish().transform(value => value || ''), translation: z.string().nullish().transform(value => value || ''), attribution: z.string().nullish().transform(value => value || ''),
  heroQuotes: z.array(heroQuoteSchema).default([]),
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
  heroQuotes: [{ couplet: 'मोको कहाँ ढूंढे बन्दे, मैं तो तेरे पास में।', translation: 'Where do you search for me? I am right beside you.', attribution: 'Kabir' }],
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

/** Older feeds keep their saved quote until the admin has migrated to the list. */
export function homepageQuotes(settings: SiteSettings): HeroQuote[] {
  if (settings.heroQuotes.length) return settings.heroQuotes;
  if (settings.couplet.trim()) return [{ couplet: settings.couplet, translation: settings.translation, attribution: settings.attribution }];
  return defaultSiteSettings.heroQuotes;
}
