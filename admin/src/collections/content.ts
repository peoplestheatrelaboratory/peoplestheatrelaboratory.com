import { APIError, type CollectionConfig, type CollectionSlug, type Field } from 'payload';
import { canEdit, canPublish, editFilter, isSuper, type Section } from '../lib/permissions';
import { afterChange, afterDelete } from '../lib/publishing';

const text = (name: string, required = false): Field => ({ name, type: 'text', required });
const many = (name: string): Field => ({ name, type: 'array', fields: [text('value', true)] });
const relation = (name: string, relationTo: CollectionSlug, hasMany = true): Field => (hasMany ? { name, type: 'relationship', relationTo, hasMany: true } : { name, type: 'relationship', relationTo, hasMany: false });
const file = (name: string): Field => ({ name, type: 'upload', relationTo: 'media' });
const body = (name: string): Field[] => [
  { name, type: 'richText' },
  { name: `${name}Imported`, type: 'textarea', admin: { hidden: true }, access: { update: ({ req }) => isSuper(req.user) } },
];
function content(slug: string, section: Section, title: string, fields: Field[]): CollectionConfig {
  return {
    slug, admin: { useAsTitle: title, group: section === 'library' ? 'Library' : 'Website', defaultColumns: [title, '_status', 'updatedAt'] },
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
      { name: 'slug', type: 'text', required: true, unique: true, index: true, validate: (value: unknown) => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || 'Use lowercase letters, numbers and hyphens.' },
      ...fields,
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
