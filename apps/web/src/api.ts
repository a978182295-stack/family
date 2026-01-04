import { getAccessToken } from './oidc';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getAccessToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = apiBaseUrl ? `${apiBaseUrl}${path}` : path;
  return fetch(url, { ...init, headers });
}
