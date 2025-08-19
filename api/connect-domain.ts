// Edge runtime (ESM) to avoid CJS/ESM mismatch
export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://catloog.vercel.app',
  'https://www.catloog.vercel.app',
]);

function withCors(resp: Response, origin?: string) {
  const headers = new Headers(resp.headers);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(resp.body, { status: resp.status, headers });
}

function corsJson(origin: string | null, obj: any, status = 200) {
  const resp = new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return withCors(resp, origin || undefined);
}

// This function connects (adds) a custom domain to the current Vercel project via Vercel REST API
// Required env vars: VERCEL_PROJECT_ID, VERCEL_TOKEN, optional VERCEL_TEAM_ID
// Request body: { domain: string }
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') {
    // Preflight
    return withCors(new Response(null, { status: 204 }), origin || undefined);
  }
  if (req.method === 'GET' && url.searchParams.get('debug') === '1') {
    const projectId = (process as any)?.env?.VERCEL_PROJECT_ID as string | undefined;
    const token = (process as any)?.env?.VERCEL_TOKEN as string | undefined;
    const teamId = (process as any)?.env?.VERCEL_TEAM_ID as string | undefined;
    return corsJson(origin, {
      ok: true,
      env: {
        VERCEL_PROJECT_ID: Boolean(projectId),
        VERCEL_TOKEN: Boolean(token),
        VERCEL_TEAM_ID: Boolean(teamId),
      },
      runtime: 'edge',
    });
  }
  if (req.method !== 'POST') {
    return corsJson(origin, { error: 'Method Not Allowed' }, 405);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    return corsJson(origin, { error: 'Invalid JSON body' }, 400);
  }

  const domain = body?.domain;
  if (!domain || typeof domain !== 'string') {
    return corsJson(origin, { error: 'Missing domain' }, 400);
  }
  // Basic domain validation (ASCII only; IDN can be extended later)
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

  const projectId = (process as any)?.env?.VERCEL_PROJECT_ID as string | undefined;
  const token = (process as any)?.env?.VERCEL_TOKEN as string | undefined;
  const teamId = (process as any)?.env?.VERCEL_TEAM_ID as string | undefined;
  if (!projectId || !token) {
    return corsJson(origin, { error: 'Missing Vercel credentials on server' }, 500);
  }

  const normalized = String(domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domainRegex.test(normalized)) {
    return corsJson(origin, { error: 'Invalid domain format' }, 400);
  }
  const isApex = normalized.split('.').length === 2; // example.com

  try {
    const addUrl = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`);
    if (teamId) addUrl.searchParams.set('teamId', teamId);
    const addResp = await fetch(addUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: normalized }),
    });

    let addData: any = null;
    try {
      const text = await addResp.text();
      addData = text ? JSON.parse(text) : null;
    } catch {}

    if (!addResp.ok) {
      const code = addData?.error?.code || addData?.code;
      if (!(code && String(code).includes('domain_already'))) {
        // Common helpful messages
        if (code === 'domain_conflict' || code === 'domain_already_in_use') {
          return corsJson(origin, { error: 'Domain is already in use by another project or team on Vercel. Remove it there first or transfer ownership.' }, 409);
        }
        if (addResp.status === 401 || addResp.status === 403) {
          return corsJson(origin, { error: 'Unauthorized: Check VERCEL_TOKEN and VERCEL_TEAM_ID (if using a Team).' }, addResp.status);
        }
        if (addResp.status === 404) {
          return corsJson(origin, { error: 'Project not found: Verify VERCEL_PROJECT_ID belongs to this project/account/team.' }, 404);
        }
        return corsJson(origin, { error: addData?.error?.message || addData || 'Failed to add domain' }, addResp.status);
      }
    }

    // Trigger verification explicitly (best-effort)
    try {
      const verifyUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(normalized)}/verify`);
      if (teamId) verifyUrl.searchParams.set('teamId', teamId);
      await fetch(verifyUrl.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}

    const statusUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(normalized)}`);
    if (teamId) statusUrl.searchParams.set('teamId', teamId);
    const statusResp = await fetch(statusUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    let statusData: any = null;
    try {
      const text = await statusResp.text();
      statusData = text ? JSON.parse(text) : null;
    } catch {}

    if (!statusResp.ok) {
      return corsJson(origin, { error: statusData?.error?.message || statusData || 'Failed to fetch domain status' }, statusResp.status);
    }

    const verified = Boolean(statusData?.verified);
    const txtRecords = statusData?.verification || [];

    return corsJson(origin, {
      success: true,
      domain: normalized,
      verified,
      needsDNS: !verified,
      instructions: verified
        ? 'Domain is verified and active.'
        : isApex
          ? 'Create an A record pointing to 76.76.21.21. For www, add CNAME to cname.vercel-dns.com, then retry.'
          : 'Create a CNAME pointing to cname.vercel-dns.com for this subdomain, then retry.',
      verification: txtRecords,
    });
  } catch (e: any) {
    return corsJson(origin, { error: e?.message || 'Unexpected error' }, 500);
  }
}

