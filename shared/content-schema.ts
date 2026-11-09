import { z } from 'zod';
const s = z.string();
const strings = z.array(s);
const slug = s.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const date = s.regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
export const contentSchema = z.object({
  artists: z.array(z.object({ slug, name: s, nameDeva: s, roles: strings, era: s, link: s, photo: s, note: s })),
  songs: z.array(z.object({ slug, title: s, titleLatin: s, poets: strings, singers: strings, language: strings, genre: strings, geography: strings, raag: s, lyrics: strings, meaning: s, references: z.array(z.object({ label: s, url: s })) })),
  events: z.array(z.object({ slug, title: s, titleDeva: s, series: z.enum(['','Baithak','Kabir Sang Ruhdaari','Production','Workshop']), date, tithi: s, venue: s, city: s, summary: s, registerUrl: s, cover: s, setlist: strings, artists: strings, performers: z.array(z.object({ name: s, part: s })).default([]), body: s })),
  team: z.array(z.object({ slug, name: s, nameDeva: s, role: s, order: z.number(), photo: s, socials: s, bio: s })),
  posts: z.array(z.object({ slug, title: s, date, authors: strings, excerpt: s, cover: s, tags: strings, relatedEvent: s, body: s })),
  scripts: z.array(z.object({ slug, title: s, titleDeva: s, playwrights: strings, language: strings, year: z.number().nullable(), file: s, synopsis: s, productions: strings, body: s })),
  quotes: z.array(z.object({ couplet: s, translation: s, attribution: s, poet: s, order: z.number() })),
});
