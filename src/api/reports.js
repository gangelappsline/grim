import { apiFetch } from './client_api';

export function getReportSummary() {
  return apiFetch('/reports/summary');
}

export async function getReportLoans(from, to, status) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (status) params.set('status', status);
  const query = params.toString();
  const res = await apiFetch(`/reports/loans${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getReportPayments(from, to, paymentMethod) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (paymentMethod) params.set('payment_method', paymentMethod);
  const query = params.toString();
  const res = await apiFetch(`/reports/payments${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getReportOverdue() {
  const res = await apiFetch('/reports/overdue');
  return res.data;
}