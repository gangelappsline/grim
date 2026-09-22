import { apiFetch } from './client_api';

export function getDashboard() {
  return apiFetch('/dashboard');
}

export async function getLoans(status, clientId) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (clientId) params.set('client_id', String(clientId));
  const query = params.toString();
  const res = await apiFetch(`/loans${query ? `?${query}` : ''}`);
  return { loans: res.data, total: res.data.length };
}

export async function getLoan(id) {
  const res = await apiFetch(`/loans/${id}`);
  return res.data;
}

export function createLoan(payload) {
  return apiFetch('/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateLoan(id, payload) {
  return apiFetch(`/loans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteLoan(id) {
  return apiFetch(`/loans/${id}`, { method: 'DELETE' });
}