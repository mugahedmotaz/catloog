import { toast } from 'react-hot-toast';

const API_BASE = '';

function normalizeDomain(input: string): string {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return '';
  let d = raw.replace(/^https?:\/\//, '').replace(/\/$/, '');
  d = d.replace(/^www\./, '');
  return d;
}

export type DomainStatus = {
  success?: boolean;
  ok?: boolean;
  domain?: string;
  verified?: boolean;
  needsDNS?: boolean;
  instructions?: string;
  verification?: any[];
  error?: string;
};

async function handleJson(resp: Response) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

export async function addDomain(domain: string): Promise<DomainStatus> {
  const d = normalizeDomain(domain);
  const resp = await fetch(`${API_BASE}/api/connect-domain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: d }),
  });
  const data = await handleJson(resp);
  if (!resp.ok) {
    const msg = data?.error || data?.raw || 'Failed to add domain';
    toast.error(String(msg));
  } else {
    toast.success('Request sent. Check DNS instructions if provided.');
  }
  return data as DomainStatus;
}

export async function getDomainStatus(domain: string): Promise<DomainStatus> {
  const d = normalizeDomain(domain);
  const url = new URL(`${API_BASE}/api/connect-domain`, window.location.origin);
  url.searchParams.set('status', '1');
  url.searchParams.set('domain', d);
  const resp = await fetch(url.toString());
  const data = await handleJson(resp);
  if (!resp.ok) {
    const msg = data?.error || data?.raw || 'Failed to fetch domain status';
    toast.error(String(msg));
  }
  return data as DomainStatus;
}

export async function removeDomain(domain: string): Promise<DomainStatus> {
  const d = normalizeDomain(domain);
  const resp = await fetch(`${API_BASE}/api/connect-domain`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: d }),
  });
  const data = await handleJson(resp);
  if (!resp.ok) {
    const msg = data?.error || data?.raw || 'Failed to remove domain';
    toast.error(String(msg));
  } else {
    toast.success('Domain removed');
  }
  return data as DomainStatus;
}
