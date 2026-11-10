import { defaultSiteSettings, siteSettingsSchema, type SiteSettings } from '../../shared/site-settings';
const requests = new WeakMap<object, Promise<SiteSettings>>();
export function getSiteSettings(request: object) {
  let result = requests.get(request);
  if (!result) { result = loadSiteSettings(); requests.set(request, result); }
  return result;
}
async function loadSiteSettings(): Promise<SiteSettings> {
  const base = process.env.CMS_URL || import.meta.env.CMS_URL;
  if (!base) return defaultSiteSettings;
  const response = await fetch(new URL('/api/site-settings', base), {signal:AbortSignal.timeout(15000),cache:'no-store'});
  if (!response.ok) throw new Error(`Site settings unavailable: HTTP ${response.status}`);
  return siteSettingsSchema.parse(await response.json());
}
