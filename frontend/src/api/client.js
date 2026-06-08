const VITE_API_URL = import.meta.env.VITE_API_URL || '';
const VITE_API_BASIC_AUTH = import.meta.env.VITE_API_BASIC_AUTH || '';
const API_BASE = `${VITE_API_URL}/api`;

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (VITE_API_BASIC_AUTH) {
    headers.Authorization = `Basic ${VITE_API_BASIC_AUTH}`;
    if (token) headers['X-Auth-Token'] = token;
  } else {
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
};
