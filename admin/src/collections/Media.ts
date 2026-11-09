import { APIError, type CollectionConfig } from 'payload';
import { isStaff, isSuper } from '../lib/permissions';
import { afterChange, afterDelete } from '../lib/publishing';
export const Media: CollectionConfig = {
  slug: 'media', admin: { group: 'Library', useAsTitle: 'alt' },
  upload: { staticDir: 'media', mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
  hooks: { beforeOperation: [({ operation }) => {
    if (['create', 'update'].includes(operation) && process.env.NODE_ENV === 'production' &&
      !['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every(key => Boolean(process.env[key]))) {
      throw new APIError('Media storage is not configured. Uploads are disabled.', 503);
    }
  }], afterChange: [afterChange], afterDelete: [afterDelete] },
  access: {
    read: ({ req }) => isStaff(req.user) ? true : { public: { equals: true } },
    create: ({ req }) => isStaff(req.user),
    update: ({ req }) => isSuper(req.user), delete: ({ req }) => isSuper(req.user),
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'public', type: 'checkbox', defaultValue: false, admin: { description: 'Public files can be downloaded without signing in. Only a super admin can release them.' }, access: { create: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) } },
  ],
};
