export const sections = ['events', 'library', 'blog', 'team', 'quotes'] as const;
export type Section = typeof sections[number];
export type Staff = { id: number | string; role?: string; sections?: string[] | null; canPublish?: boolean | null; enabled?: boolean | null };
export const isStaff = (user: Staff | null | undefined) => Boolean(user && user.enabled !== false);
export const isSuper = (user: Staff | null | undefined) => isStaff(user) && user?.role === 'super-admin';
export const canEdit = (user: Staff | null | undefined, section: Section) =>
  isStaff(user) && (isSuper(user) || Boolean(user?.sections?.includes(section)));
export const canPublish = (user: Staff | null | undefined, section: Section) =>
  canEdit(user, section) && (isSuper(user) || Boolean(user?.canPublish && user.role === 'editor'));
export function editFilter(user: Staff | null | undefined, section: Section) {
  if (!canEdit(user, section)) return false;
  return user?.role === 'contributor' ? { createdBy: { equals: user.id } } : true;
}
