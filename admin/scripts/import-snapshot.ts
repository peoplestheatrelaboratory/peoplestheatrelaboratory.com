import { getPayload } from 'payload';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const { default: config } = await import('../src/payload.config');
const payload = await getPayload({ config });
const context = { trustedImport: true, skipRevalidation: true };
const root = path.resolve(process.cwd(), '..');
const collections = ['artists','songs','events','team','blog','scripts','quotes'] as const;
const source: Record<string, any[]> = {};
const ids: Record<string, Map<string, number | string>> = {};
const created = new Set<string>();
const arrayFields = ['roles','language','genre','geography','tags'];
const relations: Record<string, Record<string, string>> = { songs: { poets:'artists', singers:'artists' }, events: { artists:'artists' }, blog: { authors:'team', relatedEvent:'events' }, scripts: { playwrights:'artists', productions:'events' }, quotes: { poet:'artists' } };
const mediaKeys = ['photo','cover','file'];
try {
  // Two passes preserve cross-collection relations and setlist order. Existing
  // rows are not overwritten, so rerunning cannot erase edits made in the admin.
  for (const collection of collections) {
    source[collection] = JSON.parse(await readFile(path.join(root, 'content/site', `${collection}.json`), 'utf8'));
    ids[collection] = new Map();
    for (const [index, raw] of source[collection].entries()) {
      const slug = raw.slug || `quote-${index + 1}`;
      const existing = await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0, overrideAccess: true });
      if (existing.docs[0]) { ids[collection].set(slug, existing.docs[0].id); if (process.argv.includes('--resume-drafts') && existing.docs[0]._status === 'draft') created.add(`${collection}/${slug}`); continue; }
      const data: Record<string, any> = { ...raw, slug, _status: 'draft' };
      for (const key of Object.keys(relations[collection] || {})) delete data[key];
      delete data.setlist;
      for (const key of arrayFields) if (Array.isArray(data[key])) data[key] = data[key].map((value: string) => ({ value }));
      if (data.lyrics) data.lyrics = data.lyrics.map((stanza: string) => ({ stanza }));
      for (const key of ['note','body','bio']) if (key in data) { data[`${key}Imported`] = data[key]; delete data[key]; }
      for (const key of mediaKeys) {
        const value = data[key]; delete data[key];
        if (value) throw new Error(`Media import needed for ${collection}/${slug}: ${key}. Import the file into Media before continuing; no external URLs are silently discarded.`);
      }
      if (!data.series) delete data.series;
      const doc = await payload.create({ collection, data, draft: true, overrideAccess: true, context });
      ids[collection].set(slug, doc.id); created.add(`${collection}/${slug}`);
    }
  }
  for (const collection of collections) {
    for (const [index, raw] of source[collection].entries()) {
      const slug = raw.slug || `quote-${index + 1}`;
      if (!created.has(`${collection}/${slug}`)) continue;
      const data: Record<string, any> = { _status: 'published' };
      for (const [key,target] of Object.entries(relations[collection] || {})) {
        const value = raw[key];
        const lookup = (s: string) => { const value = ids[target].get(s); if (!value) throw new Error(`Unresolved relationship ${target}/${s}`); return value; };
        data[key] = Array.isArray(value) ? value.map(lookup) : value ? lookup(value) : null;
      }
      if (collection === 'events') data.setlist = raw.setlist.map((s: string) => { const song = ids.songs.get(s); if (!song) throw new Error(`Unresolved song ${s}`); return { song }; });
      console.log(`Publishing ${collection}/${slug}`);
      await payload.update({ collection, id: ids[collection].get(slug)!, data, overrideAccess: true, context });
    }
    console.log(`${collection}: ${source[collection].length} records checked`);
  }
  console.log(`Imported ${created.size} new records. Existing content preserved.`);
} catch (error) { console.error(error); process.exitCode = 1; } finally { await Promise.race([payload.destroy(), new Promise(resolve => setTimeout(resolve, 3000))]); }

process.exit(process.exitCode || 0);
