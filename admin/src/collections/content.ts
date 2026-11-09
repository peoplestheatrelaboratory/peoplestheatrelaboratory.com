import { APIError, type CollectionConfig, type CollectionSlug, type Field } from 'payload';
import { canEdit, canPublish, editFilter, isSuper, type Section } from '../lib/permissions';
import { afterChange, afterDelete } from '../lib/publishing';
import { contentSections } from '../lib/content-sections';

const text = (name: string, required = false): Field => ({ name, type: 'text', required });
const many = (name: string): Field => ({ name, type: 'array', fields: [text('value', true)] });
const relation = (name: string, relationTo: CollectionSlug, hasMany = true): Field => (hasMany ? { name, type: 'relationship', relationTo, hasMany: true } : { name, type: 'relationship', relationTo, hasMany: false });
const file = (name: string): Field => ({ name, type: 'upload', relationTo: 'media' });
const body = (name: string): Field[] => [
  { name, type: 'richText' },
  { name: `${name}Imported`, type: 'textarea', admin: { hidden: true }, access: { update: ({ req }) => isSuper(req.user) } },
];
const fieldLabels: Record<string, string> = {
  nameDeva: 'Name in Devanagari', titleDeva: 'Title in Devanagari', titleLatin: 'Title in Latin script',
  registerUrl: 'Registration link', setlist: 'Songs in performance order', raag: 'Raag',
  note: 'About this person', body: 'Full text', bio: 'About this team member', socials: 'Social profile link',
  couplet: 'Quote or couplet', attribution: 'Attributed to', order: 'Display order',
};
const essentialFields: Record<string, string[]> = {
  events: ['title', 'series', 'date', 'venue', 'city', 'summary', 'setlist'],
  songs: ['title', 'poets', 'lyrics', 'meaning'], artists: ['name', 'roles', 'note', 'noteImported'],
  team: ['name', 'role', 'photo', 'bio', 'bioImported'], blog: ['title', 'date', 'excerpt', 'body', 'bodyImported'],
  scripts: ['title', 'playwrights', 'file', 'synopsis'], quotes: ['couplet', 'attribution', 'translation'],
};
function organiseFields(slug: string, fields: Field[]): Field[] {
  const labelled = fields.map(field => 'name' in field && field.name && fieldLabels[field.name]
    ? { ...field, label: fieldLabels[field.name] } : field);
  const main = labelled.filter(field => 'name' in field && essentialFields[slug].includes(field.name!));
  const optional = labelled.filter(field => !main.includes(field));
  return [...main, ...(optional.length ? [{ type: 'collapsible' as const, label: 'More details (optional)', admin: { initCollapsed: true }, fields: optional }] : [])];
}
function content(slug: string, section: Section, title: string, fields: Field[]): CollectionConfig {
  const info = contentSections.find(item => item.slug === slug)!;
  return {
    slug, labels: { singular: info.singular[0].toUpperCase() + info.singular.slice(1), plural: info.label },
    admin: {
      useAsTitle: title, group: 'Content', description: info.description, hideAPIURL: true,
      hidden: ({ user }) => !canEdit(user, section),
      defaultColumns: [title, '_status', 'updatedAt'],
    },
    versions: { drafts: true, maxPerDoc: 15 },
    access: {
      create: ({ req }) => canEdit(req.user, section),
      read: ({ req }) => canEdit(req.user, section) ? true : { _status: { equals: 'published' } },
      update: ({ req }) => editFilter(req.user, section),
      delete: ({ req }) => canPublish(req.user, section),
      readVersions: ({ req }) => canEdit(req.user, section),
    },
    hooks: {
      beforeOperation: [({ args, operation, req }) => {
        if (operation === 'create' || operation === 'update') req.context.ptlSavingDraft = 'draft' in args && args.draft === true;
      }],
      beforeChange: [({ data, originalDoc, req, operation }) => {
        if (!req.context.trustedImport && !canPublish(req.user, section)) {
          // A non-publisher cannot alter an existing published row without a draft save.
          if (data._status === 'published' || (originalDoc?._status === 'published' && req.context.ptlSavingDraft !== true)) throw new APIError('Publishing permission is required. Save a draft for review.', 403);
          data._status = 'draft';
        }
        if (operation === 'create') data.createdBy = req.user?.id;
        else data.createdBy = originalDoc?.createdBy;
        return data;
      }],
      afterChange: [afterChange], afterDelete: [afterDelete],
    },
    fields: [
      { name: 'slug', label: 'Page address', type: 'text', required: true, unique: true, index: true, admin: { position: 'sidebar', description: 'The short name used in the link, e.g. november-baithak. Keep it unchanged after sharing the page.' }, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase letters, numbers and hyphens.' },
      ...organiseFields(slug, fields),
      { name: 'createdBy', type: 'relationship', relationTo: 'users', admin: { hidden: true }, access: { read: ({ req }) => Boolean(req.user), update: () => false } },
    ],
  };
}
export const contentCollections: CollectionConfig[] = [
  content('artists', 'library', 'name', [text('name', true), text('nameDeva'), many('roles'), text('era'), text('link'), file('photo'), ...body('note')]),
  content('songs', 'library', 'title', [text('title', true), text('titleLatin'), relation('poets', 'artists'), relation('singers', 'artists'), many('language'), many('genre'), many('geography'), text('raag'), { name: 'lyrics', type: 'array', fields: [{ name: 'stanza', type: 'textarea', required: true }], admin: { description: 'One stanza per row. Keep line breaks within each stanza.' } }, { name: 'meaning', type: 'textarea' }, { name: 'references', type: 'array', fields: [text('label', true), text('url', true)] }]),
  content('events', 'events', 'title', [text('title', true), text('titleDeva'), { name: 'series', type: 'select', options: ['Baithak', 'Kabir Sang Ruhdaari', 'Production', 'Workshop'] }, { name: 'date', type: 'date', admin: { date: { pickerAppearance: 'dayOnly' } } }, text('tithi'), text('venue'), text('city'), { name: 'summary', type: 'textarea' }, text('registerUrl'), file('cover'), { name: 'setlist', type: 'array', fields: [relation('song', 'songs', false)], admin: { description: 'Drag rows to change performance order.' } }, relation('artists', 'artists'), ...body('body')]),
  content('team', 'team', 'name', [text('name', true), text('nameDeva'), text('role'), { name: 'order', type: 'number', defaultValue: 0 }, file('photo'), text('socials'), ...body('bio')]),
  content('blog', 'blog', 'title', [text('title', true), { name: 'date', type: 'date' }, relation('authors', 'team'), { name: 'excerpt', type: 'textarea' }, file('cover'), many('tags'), relation('relatedEvent', 'events', false), ...body('body')]),
  content('scripts', 'library', 'title', [text('title', true), text('titleDeva'), relation('playwrights', 'artists'), many('language'), { name: 'year', type: 'number' }, file('file'), { name: 'synopsis', type: 'textarea' }, relation('productions', 'events'), ...body('body')]),
  content('quotes', 'quotes', 'attribution', [{ name: 'couplet', type: 'textarea', required: true }, { name: 'translation', type: 'textarea' }, text('attribution', true), relation('poet', 'artists', false), { name: 'order', type: 'number', defaultValue: 0 }]),
];
