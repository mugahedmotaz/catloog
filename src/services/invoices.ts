import { supabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
const RECEIPTS_BUCKET = (import.meta as any).env?.VITE_SUPABASE_RECEIPTS_BUCKET || 'receipts';

export type InvoiceStatus = 'pending_receipt' | 'under_review' | 'approved' | 'rejected';

export interface InvoiceRecord {
  id: string;
  store_id: string;
  plan_id: string;
  period: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  status: InvoiceStatus;
  receipt_url: string | null;
  created_at: string;
}

export interface InvoiceWithRelations extends Omit<InvoiceRecord, 'status'> { // status not returned in select
  stores?: { name: string } | { name: string }[] | null;
  plans?: { name: string } | { name: string }[] | null;
  invoice_payments?: Array<{
    reference_code: string;
    paid_at: string | null;
    payer_name: string | null;
    note: string | null;
    created_at: string;
  }> | null;
}

export async function createInvoice(params: { storeId: string; planId: string; period: 'monthly'|'yearly'; amount: number; currency: string }, client: SupabaseClient = supabase): Promise<InvoiceRecord> {
  const payload = {
    store_id: params.storeId,
    plan_id: params.planId,
    period: params.period,
    amount: params.amount,
    currency: params.currency,
    status: 'pending_receipt' as InvoiceStatus,
  };
  const { data, error } = await client.from('invoices').insert(payload).select('*').single();
  if (error) throw error;
  return data as InvoiceRecord;
}

export async function uploadReceipt(invoiceId: string, storeId: string, file: File, client: SupabaseClient = supabase): Promise<string> {
  const path = `${storeId}/${invoiceId}-${Date.now()}-${file.name}`;
  const { data, error } = await client.storage.from(RECEIPTS_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const pub = await client.storage.from(RECEIPTS_BUCKET).getPublicUrl(data.path);
  const url = pub.data.publicUrl;
  const { error: updErr } = await client.from('invoices').update({ receipt_url: url, status: 'under_review' }).eq('id', invoiceId);
  if (updErr) throw updErr;
  return url;
}

export async function listPendingInvoices(client: SupabaseClient = supabase): Promise<InvoiceWithRelations[]> {
  // Attempt to fetch related store/plan names and payment reference details
  const { data, error } = await client
    .from('invoices')
    .select(`
      id, store_id, plan_id, period, amount, currency, receipt_url, created_at,
      stores ( name ),
      plans ( name ),
      invoice_payments ( reference_code, paid_at, payer_name, note, created_at )
    `)
    .eq('status', 'under_review')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as InvoiceWithRelations[];
}

export async function setInvoiceStatus(client: SupabaseClient, id: string, status: InvoiceStatus, reason?: string): Promise<void> {
  const payload: any = { status };
  if (reason) payload.reason = reason;
  const { error } = await client.from('invoices').update(payload).eq('id', id);
  if (error) throw error;
}

// Submit payment reference without requiring a file upload
export async function submitPaymentReference(params: {
  invoiceId: string;
  storeId: string;
  referenceCode: string;
  paidAt: string; // ISO date or string
  amount?: number; // optional override
  payerName?: string;
  note?: string;
}, client: SupabaseClient = supabase): Promise<void> {
  // 1) Insert a row into a lightweight table to track references
  // Expected table (create via SQL): invoice_payments
  // columns: id, invoice_id, store_id, reference_code, paid_at, amount, payer_name, note, created_at
  const insertPayload: any = {
    invoice_id: params.invoiceId,
    store_id: params.storeId,
    reference_code: params.referenceCode,
    paid_at: params.paidAt,
    amount: params.amount ?? null,
    payer_name: params.payerName ?? null,
    note: params.note ?? null,
  };
  const { error: insErr } = await client.from('invoice_payments').insert(insertPayload);
  if (insErr) throw insErr;

  // 2) Move invoice to under_review for admin approval
  const { error: updErr } = await client
    .from('invoices')
    .update({ status: 'under_review' as InvoiceStatus })
    .eq('id', params.invoiceId);
  if (updErr) throw updErr;
}
