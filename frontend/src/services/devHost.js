const DEV_HOST_API_URL = (import.meta.env.VITE_DEV_HOST_API_URL || '/api/dev-host').replace(/\/$/, '');

const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('accessToken');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const parseDevHostResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error || payload.message || `Erreur API DEV (${response.status})`;
    const error = new Error(message);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
};

export const devHostConfig = {
  apiUrl: DEV_HOST_API_URL,
  accessMode: 'via backend',
};

export const getDevHostStatus = async () => {
  const response = await fetch(`${DEV_HOST_API_URL}/status`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return parseDevHostResponse(response);
};

export const triggerDevHostUpdate = async () => {
  const response = await fetch(`${DEV_HOST_API_URL}/update`, {
    method: 'POST',
    headers: buildHeaders(),
  });
  return parseDevHostResponse(response);
};

export const forcePwaRefresh = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  window.location.reload();
};
