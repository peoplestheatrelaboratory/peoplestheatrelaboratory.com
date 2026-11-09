import type { SiteSettings } from './site-settings';
export function chooseVideoVariant(variants: SiteSettings['videoVariants'], width: number) {
  return [...variants].filter(v => v.minWidth <= width).sort((a,b) => b.minWidth - a.minWidth)[0];
}
