const API_URL = 'https://grim-api.appsline.com.mx/api/v1';
//const API_URL = 'http://127.0.0.1:8000/api/v1';//'https://grim-api.appsline.com.mx/api/v1';
const TOKEN_KEY = 'grim_token';

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail ?? error.message ?? 'Error en la solicitud');
  }

  if (response.status !== 204) {
    return response.json();
  }
}

export { API_URL, TOKEN_KEY };