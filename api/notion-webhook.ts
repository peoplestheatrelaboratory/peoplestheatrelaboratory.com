/**
 * Vercel function: Notion → rebuild.
 *
 * Notion calls this on every change in the connected databases. We verify the
 * signature, then poke a Vercel Deploy Hook so the site rebuilds from fresh
 * content. Vercel collapses builds that queue up within the same minute, so a
 * burst of edits costs one or two builds, not twenty.
 *
 * Env: NOTION_WEBHOOK_SECRET (the verification token Notion shows when the
 * subscription is created), VERCEL_DEPLOY_HOOK_URL.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const config = { runtime: 'nodejs' };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  let body: any = {};
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }

  // First call from Notion carries the verification token; surface it in the logs once.
  if (body.verification_token) {
    console.log('notion verification_token:', body.verification_token);
    return new Response('ok', { status: 200 });
  }

  const secret = process.env.NOTION_WEBHOOK_SECRET;
  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!secret || !hook) return new Response('Server not configured', { status: 500 });

  const given = req.headers.get('x-notion-signature') ?? '';
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  const ok =
    given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return new Response('Bad signature', { status: 401 });

  // Only content changes matter; ignore e.g. comment events.
  const type: string = body.type ?? '';
  if (!/^(page|data_source|database)\./.test(type)) return new Response('ignored', { status: 200 });

  const res = await fetch(hook, { method: 'POST' });
  return new Response(res.ok ? 'rebuild queued' : 'deploy hook failed', { status: res.ok ? 200 : 502 });
}
