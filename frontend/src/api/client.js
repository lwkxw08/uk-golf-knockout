const API_BASE = '/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('token');
    const method = options.method || 'GET';
    const xhr = new XMLHttpRequest();

    xhr.open(method, `${API_BASE}${path}`);

    if (token) xhr.setRequestHeader('X-Auth-Token', token);
    if (!(options.body instanceof FormData)) {
      xhr.setRequestHeader('Content-Type', 'application/json');
    }

    xhr.onload = function () {
      if (xhr.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return reject(new Error('Unauthorized'));
      }
      let data;
      try { data = JSON.parse(xhr.responseText); } catch { data = {}; }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data.error || 'Request failed'));
      }
    };
    xhr.onerror = function () {
      reject(new Error('Network error'));
    };

    xhr.send(options.body ?? null);
  });
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
};
