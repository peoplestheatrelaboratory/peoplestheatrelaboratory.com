import type { CollectionSlug } from 'payload';
import type { Section } from './permissions';

export const contentSections: { slug: CollectionSlug; label: string; singular: string; description: string; section?: Section }[] = [
  { slug: 'events', label: 'Events', singular: 'event', description: 'Baithaks, gatherings, dates and performance setlists.', section: 'events' },
  { slug: 'songs', label: 'Songs & lyrics', singular: 'song', description: 'Lyrics, meanings, poets and musical references.', section: 'library' },
  { slug: 'artists', label: 'Artists & poets', singular: 'artist', description: 'The voices and people behind the work.', section: 'library' },
  { slug: 'team', label: 'Team', singular: 'team member', description: 'Introduce the people who make PTL possible.', section: 'team' },
  { slug: 'blog', label: 'Articles', singular: 'article', description: 'Stories, reflections and news from PTL.', section: 'blog' },
  { slug: 'scripts', label: 'Theatre scripts', singular: 'script', description: 'Plays, playwrights and script downloads.', section: 'library' },
  { slug: 'quotes', label: 'Quotes', singular: 'quote', description: 'Couplets, translations and words to share.', section: 'quotes' },
  { slug: 'media', label: 'Photos & files', singular: 'file', description: 'Upload images and PDFs, and choose who can see them.' },
];
