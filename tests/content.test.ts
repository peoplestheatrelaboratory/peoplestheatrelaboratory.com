import { expect, test } from 'bun:test';
import { createContent, snapshotContent } from '../src/lib/content';
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
