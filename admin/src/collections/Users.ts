import { APIError, type CollectionConfig } from 'payload';
import { isStaff, isSuper, sections } from '../lib/permissions';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: { useAsTitle: 'name', group: 'Administration', defaultColumns: ['name', 'email', 'role', 'enabled'] },
  auth: { tokenExpiration: 7200, maxLoginAttempts: 5, lockTime: 600000 },
  access: {
    admin: ({ req }) => isStaff(req.user),
    create: ({ req }) => isSuper(req.user),
    read: ({ req }) => isSuper(req.user) || (isStaff(req.user) ? { id: { equals: req.user!.id } } : false),
    update: ({ req }) => isSuper(req.user) || (isStaff(req.user) ? { id: { equals: req.user!.id } } : false),
    delete: ({ req, id }) => isSuper(req.user) && String(id) !== String(req.user!.id),
  },
  hooks: {
    beforeValidate: [({ data, req, operation, context }) => {
      // Also covers Payload's first-register route, which bypasses create access.
      if (operation === 'create' && !isSuper(req.user) && !context.bootstrap) throw new APIError('Only a super admin can create accounts.', 403);
      return data;
    }],
    beforeChange: [({ data, originalDoc, req, operation }) => {
      if (operation === 'update' && originalDoc?.id === req.user?.id && originalDoc.role === 'super-admin' && (data.role && data.role !== 'super-admin' || data.enabled === false)) {
        throw new APIError('Another super admin must change your administrative access.', 400);
      }
      return data;
    }],
    beforeLogin: [({ user }) => { if (user.enabled === false) throw new APIError('This account is disabled.', 403); return user; }],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'select', required: true, defaultValue: 'contributor', options: [
      { label: 'Super admin', value: 'super-admin' }, { label: 'Editor', value: 'editor' }, { label: 'Contributor (own drafts)', value: 'contributor' },
    ], access: { create: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) } },
    { name: 'sections', type: 'select', hasMany: true, options: [...sections], access: { create: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) } },
    { name: 'canPublish', type: 'checkbox', defaultValue: false, admin: { description: 'Editors only. Contributors always submit drafts for review.' }, access: { create: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) } },
    { name: 'enabled', type: 'checkbox', defaultValue: true, access: { create: ({ req }) => isSuper(req.user), update: ({ req }) => isSuper(req.user) } },
  ],
};
