// This function connects (adds) a custom domain to the current Vercel project via Vercel REST API
// Required env vars: VERCEL_PROJECT_ID, VERCEL_TOKEN
// Request body: { domain: string }
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { domain } = req.body || {};
  if (!domain || typeof domain !== 'string') {
    return res.status(400).json({ error: 'Missing domain' });
  }

  const projectId = process.env.VERCEL_PROJECT_ID;
  const token = process.env.VERCEL_TOKEN;
  if (!projectId || !token) {
    return res.status(500).json({ error: 'Missing Vercel credentials on server' });
  }

  // Normalize domain (strip protocol/spaces)
  const normalized = String(domain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

  try {
    // Add domain to project
    const addResp = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: normalized }),
    });

    const addData = await addResp.json();

    // If domain already exists on the project, Vercel may return error code 'domain_already_exists' or similar
    if (!addResp.ok) {
      // If already added, proceed to fetch its status
      const code = addData?.error?.code || addData?.code;
      if (code && String(code).includes('domain_already')) {
        // fall through to status check below
      } else {
        return res.status(addResp.status).json({ error: addData?.error?.message || addData });
      }
    }

    // Check domain status
    const statusResp = await fetch(`https://api.vercel.com/v6/domains/${encodeURIComponent(normalized)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const statusData = await statusResp.json();

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
    return res.status(500).json({ error: e?.message || 'Unexpected error' });
  }
}
