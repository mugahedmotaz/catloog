// Edge runtime (ESM) to avoid CJS/ESM mismatch
export const config = { runtime: 'edge' };

// This function connects (adds) a custom domain to the current Vercel project via Vercel REST API
// Required env vars: VERCEL_PROJECT_ID, VERCEL_TOKEN, optional VERCEL_TEAM_ID
// Request body: { domain: string }
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const domain = body?.domain;
  if (!domain || typeof domain !== 'string') {
    return json({ error: 'Missing domain' }, 400);
  }
  // Basic domain validation (ASCII only; IDN can be extended later)
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[A-Za-z]{2,}$/;

  const projectId = (process as any)?.env?.VERCEL_PROJECT_ID as string | undefined;
  const token = (process as any)?.env?.VERCEL_TOKEN as string | undefined;
  const teamId = (process as any)?.env?.VERCEL_TEAM_ID as string | undefined;
  if (!projectId || !token) {
    return json({ error: 'Missing Vercel credentials on server' }, 500);
  }

  const normalized = String(domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domainRegex.test(normalized)) {
    return json({ error: 'Invalid domain format' }, 400);
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
          return json({ error: 'Domain is already in use by another project or team on Vercel. Remove it there first or transfer ownership.' }, 409);
        }
        if (addResp.status === 401 || addResp.status === 403) {
          return json({ error: 'Unauthorized: Check VERCEL_TOKEN and VERCEL_TEAM_ID (if using a Team).' }, addResp.status);
        }
        if (addResp.status === 404) {
          return json({ error: 'Project not found: Verify VERCEL_PROJECT_ID belongs to this project/account/team.' }, 404);
        }
        return json({ error: addData?.error?.message || addData || 'Failed to add domain' }, addResp.status);
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
      return json({ error: statusData?.error?.message || statusData || 'Failed to fetch domain status' }, statusResp.status);
    }

    const verified = Boolean(statusData?.verified);
    const txtRecords = statusData?.verification || [];

    return json({
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
    return json({ error: e?.message || 'Unexpected error' }, 500);
  }
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
