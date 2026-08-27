/**
 * Vercel cron (see vercel.json): rebuild once a night so "upcoming" rolls over
 * to "past" without anyone touching Notion — the site is static and only
 * otherwise rebuilds on a Notion webhook or a git push.
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set;
 * we require it so the endpoint cannot be used to burn build minutes.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) return new Response('VERCEL_DEPLOY_HOOK_URL not set', { status: 500 });
  const res = await fetch(hook, { method: 'POST' });
  return new Response(res.ok ? 'rebuild queued' : 'deploy hook failed', { status: res.ok ? 200 : 502 });
}
