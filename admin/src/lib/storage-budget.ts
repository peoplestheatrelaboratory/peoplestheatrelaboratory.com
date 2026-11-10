import { NodeHttpHandler } from '@smithy/node-http-handler';
import pg from 'pg';
export const STORAGE_LIMITS = { uploadBytes: 3_000_000, lifetimeUploadBytes: 5_000_000_000, monthlyWrites: 100_000, monthlyReads: 1_000_000 } as const;
let pool: pg.Pool | undefined;
export async function reserveStorageBudget(key: string, amount: number, limit: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > limit) throw new Error('Invalid storage reservation.');
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, idleTimeoutMillis: 10000, allowExitOnIdle: true });
  const result = await pool.query(`INSERT INTO ptl_storage_budget (key, used) VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET used = ptl_storage_budget.used + EXCLUDED.used
    WHERE ptl_storage_budget.used + EXCLUDED.used <= $3 RETURNING used`, [key, amount, limit]);
  if (!result.rowCount) throw new Error('PTL storage budget reached. Further R2 requests are blocked until the owner reviews usage.');
}
export function budgetedR2Handler() {
  const handler = new NodeHttpHandler();
  return {
    ...handler,
    async handle(...args: Parameters<NodeHttpHandler['handle']>) {
      const request = args[0];
      const listing = request.query && ('list-type' in request.query || 'uploads' in request.query || 'prefix' in request.query);
      const read = !listing && (request.method === 'GET' || request.method === 'HEAD');
      const month = new Date().toISOString().slice(0, 7);
      // Shared by app instances using this database. Other tools and branches
      // must not write to this bucket without sharing the same budget ledger.
      await reserveStorageBudget(`r2:${month}:${read ? 'read' : 'write'}`, 1, read ? STORAGE_LIMITS.monthlyReads : STORAGE_LIMITS.monthlyWrites);
      if (request.method === 'PUT') {
        const bytes = Number(request.headers['content-length']);
        if (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > STORAGE_LIMITS.uploadBytes) throw new Error('Uploads must have a known size of at most 3 MB.');
        // Deliberately never refund: retries, failed uploads and replacements all
        // consume budget, so concurrent operations cannot overshoot the allowance.
        await reserveStorageBudget('r2:lifetime-upload-bytes', bytes, STORAGE_LIMITS.lifetimeUploadBytes);
      }
      return handler.handle(...args);
    },
    destroy: () => handler.destroy(),
  };
}
