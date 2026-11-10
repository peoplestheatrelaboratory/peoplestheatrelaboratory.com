import { expect, test } from 'bun:test';
import { createContent, snapshotContent, textLang } from '../src/lib/content';
import { contentSchema } from '../shared/content-schema';
import { revalidationPaths } from '../shared/revalidation';
test('snapshot matches the CMS contract and preserves every setlist relationship', () => {
  const data = contentSchema.parse(snapshotContent);
  const content = createContent(data);
  for (const e of data.events) for (const slug of e.setlist) expect(content.getSong(slug)).toBeDefined();
});
test('upcoming events roll over at midnight in India on each render', () => {
  const event = { ...snapshotContent.events[0], date: '2026-11-10' };
  const snapshot = contentSchema.parse({ ...snapshotContent, events: [event] });
  expect(createContent(snapshot, new Date('2026-11-10T18:29:59Z')).upcomingEvents()).toHaveLength(1);
  expect(createContent(snapshot, new Date('2026-11-10T18:30:00Z')).upcomingEvents()).toHaveLength(0);
});
test('a renamed song invalidates old and new URLs including songbooks', () => {
  const paths = revalidationPaths({ collection: 'songs', documents: [{ slug: 'old-name' }, { slug: 'new-name' }] }, contentSchema.parse(snapshotContent));
  expect(paths).toContain('/library/songs/old-name/');
  expect(paths).toContain(`/events/${snapshotContent.events[0].slug}/lyrics/new-name/`);
  expect(paths).not.toContain('/admin/');
});
test('a deleted event invalidates its former song pages', () => {
  const paths = revalidationPaths({ collection: 'events', documents: [{ slug: 'deleted-event' }] }, contentSchema.parse(snapshotContent));
  expect(paths).toContain(`/events/deleted-event/lyrics/${snapshotContent.songs[0].slug}/`);
});

test('event performers preserve event-specific parts and older events remain valid', () => {
  const event = { ...snapshotContent.events[0], performers: [{ name: 'A singer', part: 'Vocals' }, { name: 'A musician', part: 'Tabla' }] };
  const parsed = contentSchema.parse({ ...snapshotContent, events: [event] });
  expect(createContent(parsed).getEvent(event.slug)?.performers).toEqual(event.performers);
  const { performers, ...legacy } = event;
  expect(contentSchema.parse({ ...snapshotContent, events: [legacy] }).events[0].performers).toEqual([]);
});

test('uploaded images carry their description and size; unknown images stay decorative', () => {
  const url = 'https://admin.example/api/media/file/room.jpg';
  const parsed = contentSchema.parse({ ...snapshotContent, media: { [url]: { alt: 'The room before a Baithak', width: 1600, height: 900 } } });
  expect(createContent(parsed).imageAttrs(url)).toEqual({ alt: 'The room before a Baithak', width: 1600, height: 900 });
  expect(createContent(contentSchema.parse(snapshotContent)).imageAttrs(url)).toEqual({ alt: '', width: undefined, height: undefined });
});
test('the homepage gathering follows the settings and is absent when its event is not published', () => {
  const event = { ...snapshotContent.events[0], date: '2026-12-01' };
  const content = createContent(contentSchema.parse({ ...snapshotContent, events: [event] }), new Date('2026-11-10T12:00:00Z'));
  expect(content.featuredGathering({ gatheringMode: 'automatic', featuredEvent: '' })?.slug).toBe(event.slug);
  expect(content.featuredGathering({ gatheringMode: 'selected', featuredEvent: event.slug })?.slug).toBe(event.slug);
  expect(content.featuredGathering({ gatheringMode: 'selected', featuredEvent: 'unpublished-draft' })).toBeUndefined();
  expect(content.featuredGathering({ gatheringMode: 'hidden', featuredEvent: event.slug })).toBeUndefined();
  const empty = createContent(contentSchema.parse({ ...snapshotContent, events: [] }));
  expect(empty.featuredGathering({ gatheringMode: 'automatic', featuredEvent: '' })).toBeUndefined();
});
test('text is tagged with the language of its script, and Latin text is left to the page', () => {
  expect(textLang('मोको कहाँ ढूंढे बन्दे')).toBe('hi');
  expect(textLang('વૈષ્ણવ જન તો')).toBe('gu');
  expect(textLang('Lalon Geeti')).toBeUndefined();
});
