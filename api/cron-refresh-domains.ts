// Node runtime (default) to allow using supabaseAdmin
import { supabaseAdmin } from '../src/services/supabaseAdmin';

function normalizeDomain(input: string): string {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  let d = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  d = d.replace(/^www\./, '');
  return d;
}

async function fetchVercelDomainStatus(domain: string) {
  const projectId = (process as any)?.env?.VERCEL_STORES_PROJECT_ID || (process as any)?.env?.VERCEL_PROJECT_ID;
  const token = (process as any)?.env?.VERCEL_TOKEN as string | undefined;
  const teamId = (process as any)?.env?.VERCEL_TEAM_ID as string | undefined;
  if (!projectId || !token) throw new Error('Missing Vercel credentials');

  const statusUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}`);
  if (teamId) statusUrl.searchParams.set('teamId', teamId);
  const statusResp = await fetch(statusUrl.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await statusResp.text();
  const data = text ? JSON.parse(text) : null;
  if (!statusResp.ok) {
    throw new Error(data?.error?.message || data || 'Failed to fetch domain status');
  }
  return data;
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // Allow only Vercel cron or optional secret
    const cronHeader = (req.headers as any).get?.('x-vercel-cron');
    const secret = (req.headers as any).get?.('x-cron-secret');
    const required = (process as any)?.env?.CRON_SECRET as string | undefined;
    if (!cronHeader && required && secret !== required) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: stores, error } = await supabaseAdmin
      .from('stores')
      .select('id, settings')
      .not('settings->>customDomain', 'is', null)
      .limit(1000);
    if (error) throw error;

    const results: any[] = [];
    for (const row of stores || []) {
      const s = row?.settings || {};
      const domain = normalizeDomain(String(s.customDomain || ''));
      if (!domain) continue;
      try {
        const status = await fetchVercelDomainStatus(domain);
        const patch = {
          ...(s || {}),
          domainStatus: { domain, ok: true, ...status },
          domainVerified: Boolean(status?.verified),
          domainLastCheckedAt: new Date().toISOString(),
        };
        const { error: upErr } = await supabaseAdmin.from('stores').update({ settings: patch }).eq('id', row.id);
        if (upErr) throw upErr;
        // audit log (best-effort)
        try { await supabaseAdmin.from('domain_audit').insert({ action: 'cron_refresh', domain, store_id: row.id, ok: true, message: null }); } catch {}
        results.push({ storeId: row.id, domain, ok: true, verified: !!status?.verified });
      } catch (e: any) {
        // Save failure as status too
        const patch = {
          ...(s || {}),
          domainStatus: { domain, ok: false, error: e?.message || 'Failed' },
          domainLastCheckedAt: new Date().toISOString(),
        };
        await supabaseAdmin.from('stores').update({ settings: patch }).eq('id', row.id);
        try { await supabaseAdmin.from('domain_audit').insert({ action: 'cron_refresh', domain, store_id: row.id, ok: false, message: e?.message || 'Failed' }); } catch {}
        results.push({ storeId: row.id, domain, ok: false, error: e?.message || 'Failed' });
      }
    }

    return new Response(JSON.stringify({ ok: true, count: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
