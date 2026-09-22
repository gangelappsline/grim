import { apiFetch } from './client_api';

export function createPayment(payload) {
  return apiFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deletePayment(id) {
  return apiFetch(`/payments/${id}`, { method: 'DELETE' });
}

export async function getPaymentSchedules(status, period, start, end) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (period) params.set('period', period);
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const query = params.toString();
  const res = await apiFetch(`/payment-schedules${query ? `?${query}` : ''}`);
  return Array.isArray(res) ? res : (res?.data ?? []);
}