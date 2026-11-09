import { describe, expect, test } from 'bun:test';
import { canEdit, canPublish, editFilter, isSuper } from '../admin/src/lib/permissions';
describe('staff permissions', () => {
  const contributor = { id: 4, role: 'contributor', sections: ['library'], enabled: true, canPublish: true };
  test('contributors can only change their own assigned drafts and never publish', () => {
    expect(canEdit(contributor, 'library')).toBe(true);
    expect(editFilter(contributor, 'library')).toEqual({ createdBy: { equals: 4 } });
    expect(canPublish(contributor, 'library')).toBe(false);
    expect(editFilter(contributor, 'events')).toBe(false);
  });
  test('publication is separately granted to editors', () => {
    const editor = { id: 3, role: 'editor', sections: ['events'], enabled: true };
    expect(canPublish(editor, 'events')).toBe(false);
    expect(canPublish({ ...editor, canPublish: true }, 'events')).toBe(true);
    expect(canPublish({ ...editor, canPublish: true }, 'library')).toBe(false);
  });
  test('disabled and anonymous users have no administrative rights', () => {
    expect(isSuper({ id: 1, role: 'super-admin', enabled: false })).toBe(false);
    expect(canEdit(null, 'events')).toBe(false);
    expect(canEdit({ ...contributor, enabled: false }, 'library')).toBe(false);
  });
});
