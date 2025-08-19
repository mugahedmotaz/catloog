// This function connects (adds) a custom domain to the current Vercel project via Vercel REST API
// Required env vars: VERCEL_PROJECT_ID, VERCEL_TOKEN
// Request body: { domain: string }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Parse body safely (support cases where req.body is undefined)
  let body: any = req.body;
  if (!body) {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString('utf8');
      if (raw) body = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse request body', e);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const { domain } = body || {};
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!projectId || !token) {
    return res.status(500).json({ error: 'Missing Vercel credentials on server' });
  }

  // Normalize domain (strip protocol/spaces)
  const normalized = String(domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  try {
    // Add domain to project
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
    } catch (e) {
      console.error('Failed to parse Vercel add domain response as JSON');
    }

    // If domain already exists on the project, Vercel may return error code 'domain_already_exists' or similar
    if (!addResp.ok) {
      // If already added, proceed to fetch its status
      const code = addData?.error?.code || addData?.code;
      if (code && String(code).includes('domain_already')) {
        // fall through to status check below
      } else {
        console.error('Vercel add domain failed', addResp.status, addData);
        return res.status(addResp.status).json({ error: addData?.error?.message || addData || 'Failed to add domain' });
      }
    }

    // Check domain status
    const statusUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(normalized)}`);
    if (teamId) statusUrl.searchParams.set('teamId', teamId);
    const statusResp = await fetch(statusUrl.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    let statusData: any = null;
    try {
      const text = await statusResp.text();
      statusData = text ? JSON.parse(text) : null;
    } catch (e) {
      console.error('Failed to parse Vercel domain status response as JSON');
    }

    if (!statusResp.ok) {
      console.error('Vercel domain status failed', statusResp.status, statusData);
      return res.status(statusResp.status).json({ error: statusData?.error?.message || statusData || 'Failed to fetch domain status' });
    }

    const verified = Boolean(statusData?.verified);
    const txtRecords = statusData?.verification || [];

    return res.status(200).json({
      success: true,
      domain: normalized,
      verified,
      needsDNS: !verified,
      instructions: verified
        ? 'Domain is verified and active.'
        : 'Create A record for apex to 76.76.21.21 and a CNAME for subdomains to cname.vercel-dns.com, then retry.',
      verification: txtRecords,
    });
  } catch (e: any) {
    console.error('Unhandled error in connect-domain function', e);
    return res.status(500).json({ error: e?.message || 'Unexpected error', details: e?.stack });
  }
}
