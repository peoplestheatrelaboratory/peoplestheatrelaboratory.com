import { loadEnvFile } from 'node:process';
import assert from 'node:assert/strict';
import pg from 'pg';
import { reserveStorageBudget } from '../src/lib/storage-budget';
loadEnvFile('.env');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const key = `verification:${crypto.randomUUID()}`;
await client.connect();
try {
  await assert.rejects(reserveStorageBudget(key, 4, 3));
  const attempts = await Promise.allSettled(Array.from({ length: 10 }, () => reserveStorageBudget(key, 1, 3)));
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 3);
  assert.equal(attempts.filter(r => r.status === 'rejected').length, 7);
  const result = await client.query('SELECT used FROM ptl_storage_budget WHERE key = $1', [key]);
  assert.equal(Number(result.rows[0].used), 3);
  console.log('PASS: concurrent reservations stop exactly at the limit; no R2 requests made.');
} finally {
  await client.query('DELETE FROM ptl_storage_budget WHERE key = $1', [key]);
  await client.end();
}
