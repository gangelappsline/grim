import { apiFetch } from './client_api';

export async function getClients(search, status) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const query = params.toString();
  const res = await apiFetch(`/clients${query ? `?${query}` : ''}`);
  return { clients: res.data };
}

export async function getClient(id) {
  const res = await apiFetch(`/clients/${id}`);
  return res.data;
}

export function createClient(payload) {
  return apiFetch('/clients', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateClient(id, payload) {
  return apiFetch(`/clients/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteClient(id) {
  return apiFetch(`/clients/${id}`, { method: 'DELETE' });
}