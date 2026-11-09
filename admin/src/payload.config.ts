import { buildConfig } from 'payload';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { s3Storage } from '@payloadcms/storage-s3';
import { nodemailerAdapter } from '@payloadcms/email-nodemailer';
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { contentCollections } from './collections/content';
import { budgetedR2Handler } from './lib/storage-budget';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const r2 = ['R2_BUCKET', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'].every(key => Boolean(process.env[key]));
const secret = process.env.PAYLOAD_SECRET;
if (!secret) throw new Error('PAYLOAD_SECRET is required. See admin/.env.example.');
export default buildConfig({
  secret,
  serverURL: process.env.ADMIN_URL || 'http://localhost:3001',
  admin: {
    user: 'users', meta: { titleSuffix: '— PTL Content studio' }, importMap: { baseDir: dirname },
    components: {
      views: { dashboard: { Component: './components/AdminHome' } },
      graphics: { Logo: './components/Brand#Logo', Icon: './components/Brand#Icon' },
      beforeLogin: ['./components/Brand#LoginHelp'],
    },
  },
  collections: [Users, Media, ...contentCollections],
  upload: { limits: { fileSize: 3_000_000 }, abortOnLimit: true },
  editor: lexicalEditor(), sharp,
  db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_MIGRATING ? process.env.DATABASE_DIRECT_URL : process.env.DATABASE_URL, max: 5 }, push: false, migrationDir: path.resolve(dirname, 'migrations') }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  cors: [process.env.ADMIN_URL || 'http://localhost:3001'],
  csrf: [process.env.ADMIN_URL || 'http://localhost:3001'],
  email: process.env.SMTP_HOST ? nodemailerAdapter({ defaultFromAddress: process.env.SMTP_FROM!, defaultFromName: 'PTL', transportOptions: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } } }) : () => ({
    name: 'email-disabled', defaultFromAddress: 'admin@example.invalid', defaultFromName: 'PTL',
    sendEmail: async () => { throw new Error('Email delivery is not configured. Contact your super admin for a password reset.'); },
  }),
  plugins: [s3Storage({ enabled: r2, alwaysInsertFields: true, collections: { media: true }, bucket: process.env.R2_BUCKET || 'ptl-media', config: { requestHandler: budgetedR2Handler(), maxAttempts: 1, endpoint: process.env.R2_ENDPOINT!, region: 'auto', forcePathStyle: true, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } } })],
});
