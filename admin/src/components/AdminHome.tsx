import Link from 'next/link';
import type { AdminViewServerProps } from 'payload';
import { contentSections } from '../lib/content-sections';
import { canEdit, isStaff, isSuper } from '../lib/permissions';

export default function AdminHome({ initPageResult }: AdminViewServerProps) {
  const { req: { user }, visibleEntities } = initPageResult;
  const available = contentSections.filter(item => visibleEntities.collections.includes(item.slug) &&
    (item.section ? canEdit(user, item.section) : isStaff(user)));
  const canPublish = isSuper(user) || (user?.role === 'editor' && user.canPublish);
  return (
    <div className="ptl-home">
      <header className="ptl-home__header">
        <p className="ptl-eyebrow">Peoples Theatre Laboratory</p>
        <h1>Your content, in one place.</h1>
        <p>Choose a section to find, edit or add something.</p>
      </header>
      <section aria-label="Content sections" className="ptl-sections">
        {available.map(item => (
          <article className="ptl-section" key={item.slug}>
            <h2><Link href={`/admin/collections/${item.slug}`}>{item.label}</Link></h2>
            <p>{item.description}</p>
            <div className="ptl-section__actions">
              <Link className="ptl-link" href={`/admin/collections/${item.slug}`}>Browse <span className="ptl-sr-only">{item.label}</span><span aria-hidden="true"> →</span></Link>
              <Link className="ptl-add" href={`/admin/collections/${item.slug}/create`}>Add {item.singular}</Link>
            </div>
          </article>
        ))}
      </section>
      {available.length === 0 && <p>Your account has no content sections assigned. Ask a super admin to give you access.</p>}
      <aside className="ptl-help" aria-labelledby="ptl-help-heading">
        <div>
          <h2 id="ptl-help-heading">Start with a draft.</h2>
          <p>{canPublish
            ? 'Save a draft while you work. When the content is ready, use Publish to release it from the admin.'
            : 'Save a draft while you work, then ask an editor with publishing access to review it.'}</p>
          <p>Photos and files stay private until a super admin makes them public.</p>
        </div>
        {isSuper(user) && <div><Link className="ptl-link" href="/admin/globals/site-settings">Homepage &amp; footer →</Link><br /><Link className="ptl-link" href="/admin/collections/users">Manage staff & access <span aria-hidden="true">→</span></Link></div>}
      </aside>
    </div>
  );
}
