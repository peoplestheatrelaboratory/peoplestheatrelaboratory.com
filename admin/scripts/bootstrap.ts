import { getPayload } from 'payload';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const { default: config } = await import('../src/payload.config');
const payload = await getPayload({ config });
try {
  if ((await payload.count({ collection: 'users', overrideAccess: true })).totalDocs !== 0) throw new Error('Bootstrap is only allowed when no users exist.');
  const email = process.env.BOOTSTRAP_EMAIL, password = process.env.BOOTSTRAP_PASSWORD;
  if (!email || !password || password.length < 16) throw new Error('Set BOOTSTRAP_EMAIL and BOOTSTRAP_PASSWORD (16+ characters) in the private environment file.');
  await payload.create({ collection: 'users', overrideAccess: true, context: { bootstrap: true }, data: { name: 'PTL Super Admin', email, password, role: 'super-admin', enabled: true, canPublish: true } });
  console.log('Super admin created. Remove bootstrap credentials from the environment.');
} finally { await payload.destroy(); }

process.exit(0);
