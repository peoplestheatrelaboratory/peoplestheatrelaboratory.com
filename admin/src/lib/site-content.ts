import type { Payload } from 'payload';
import sanitizeHtml from 'sanitize-html';
import { convertLexicalToHTML } from '@payloadcms/richtext-lexical/html';

// Public projection is an explicit allowlist. Internal users, permissions, drafts,
// private uploads and version history never enter the public content response.
export async function siteContent(payload: Payload) {
  const names = ['artists', 'songs', 'events', 'team', 'blog', 'scripts', 'quotes', 'media'] as const;
  const entries = await Promise.all(names.map(async collection => {
    const result = await payload.find({ collection, depth: 0, pagination: false, draft: false, overrideAccess: false, user: null,
      where: collection === 'media' ? { public: { equals: true } } : { _status: { equals: 'published' } }, sort: collection === 'quotes' || collection === 'team' ? 'order' : '-createdAt' });
    return [collection, result.docs] as const;
  }));
  const db = Object.fromEntries(entries) as Record<string, Record<string, any>[]>;
  const indexes = Object.fromEntries(names.map(name => [name, new Map(db[name].map(d => [d.id, d]))]));
  const id = (value: any) => typeof value === 'object' && value ? value.id : value;
  const slug = (collection: string, value: any): string => indexes[collection].get(id(value))?.slug ?? '';
  const relations = (collection: string, values: any[] = []) => values.map(v => slug(collection, v)).filter(Boolean);
  const values = (rows: any[] = []) => rows.map(row => row.value);
  const string = (v: any) => typeof v === 'string' ? v : '';
  const url = (v: any) => /^(https?:\/\/|mailto:|tel:)/i.test(string(v)) ? v : '';
  const media = (value: any) => {
    const doc = indexes.media.get(id(value));
    return doc?.filename ? new URL(`/api/media/file/${encodeURIComponent(doc.filename)}`, process.env.ADMIN_URL || 'http://localhost:3001').href : '';
  };
  const html = (doc: any, key: string) => sanitizeHtml(doc[key]?.root ? convertLexicalToHTML({ data: doc[key] }) : string(doc[`${key}Imported`]), {
    allowedTags: ['p','br','strong','em','u','s','blockquote','ul','ol','li','h2','h3','h4','a','hr'],
    allowedAttributes: { a: ['href', 'title'] }, allowedSchemes: ['https','http','mailto','tel'],
  });
  const day = (v: any) => v ? String(v).slice(0, 10) : null;
  return {
    artists: db.artists.map(d => ({ slug: d.slug, name: d.name, nameDeva: string(d.nameDeva), roles: values(d.roles), era: string(d.era), link: url(d.link), photo: media(d.photo), note: html(d, 'note') })),
    songs: db.songs.map(d => ({ slug: d.slug, title: d.title, titleLatin: string(d.titleLatin), poets: relations('artists', d.poets), singers: relations('artists', d.singers), language: values(d.language), genre: values(d.genre), geography: values(d.geography), raag: string(d.raag), lyrics: (d.lyrics || []).map((r: any) => r.stanza), meaning: string(d.meaning), references: (d.references || []).map((r: any) => ({ label: r.label, url: url(r.url) })).filter((r: any) => r.url) })),
    events: db.events.map(d => ({ slug: d.slug, title: d.title, titleDeva: string(d.titleDeva), series: d.series || '', date: day(d.date), tithi: string(d.tithi), venue: string(d.venue), city: string(d.city), summary: string(d.summary), registerUrl: url(d.registerUrl), cover: media(d.cover), setlist: relations('songs', (d.setlist || []).map((r: any) => r.song)), artists: relations('artists', d.artists), body: html(d, 'body') })),
    team: db.team.map(d => ({ slug: d.slug, name: d.name, nameDeva: string(d.nameDeva), role: string(d.role), order: d.order || 0, photo: media(d.photo), socials: url(d.socials), bio: html(d, 'bio') })),
    posts: db.blog.map(d => ({ slug: d.slug, title: d.title, titleDeva: string(d.titleDeva), date: day(d.date), authors: relations('team', d.authors), excerpt: string(d.excerpt), cover: media(d.cover), tags: values(d.tags), relatedEvent: slug('events', d.relatedEvent), body: html(d, 'body') })),
    scripts: db.scripts.map(d => ({ slug: d.slug, title: d.title, titleDeva: string(d.titleDeva), playwrights: relations('artists', d.playwrights), language: values(d.language), year: d.year ?? null, file: media(d.file), synopsis: string(d.synopsis), productions: relations('events', d.productions), body: html(d, 'body') })),
    quotes: db.quotes.map(d => ({ couplet: d.couplet, translation: string(d.translation), attribution: d.attribution, poet: slug('artists', d.poet), order: d.order || 0 })),
  };
}
