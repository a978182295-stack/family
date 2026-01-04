type OidcConfig = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

type TokenRecord = {
  accessToken: string;
  expiresAt: number;
};

const TOKEN_KEY = 'family-hub:oidc:token';
const STATE_KEY = 'family-hub:oidc:state';
const VERIFIER_KEY = 'family-hub:oidc:verifier';
const CONFIG_KEY = 'family-hub:oidc:config';

const DEFAULT_SCOPE = 'openid profile email';

function getEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, string | undefined>)[key];
}

function getIssuer(): string | null {
  return getEnv('VITE_OIDC_ISSUER_URL') ?? null;
}

function getClientId(): string | null {
  return getEnv('VITE_OIDC_CLIENT_ID') ?? null;
}

function getRedirectUri(): string {
  return getEnv('VITE_OIDC_REDIRECT_URI') ?? window.location.origin;
}

function getScope(): string {
  return getEnv('VITE_OIDC_SCOPE') ?? DEFAULT_SCOPE;
}

async function discoverConfig(): Promise<OidcConfig> {
  const cached = sessionStorage.getItem(CONFIG_KEY);
  if (cached) {
    return JSON.parse(cached) as OidcConfig;
  }

  const issuer = getIssuer();
  if (!issuer) {
    throw new Error('OIDC issuer not configured.');
  }

  const response = await fetch(`${issuer.replace(/\\/$/, '')}/.well-known/openid-configuration`);
  if (!response.ok) {
    throw new Error('OIDC discovery failed.');
  }

  const config = (await response.json()) as OidcConfig;
  sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  return config;
}

function randomString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

export async function loginWithOidc(): Promise<void> {
  const issuer = getIssuer();
  const clientId = getClientId();
  if (!issuer || !clientId) {
    throw new Error('OIDC client not configured.');
  }

  const config = await discoverConfig();
  const state = randomString(16);
  const verifier = randomString(32);
  const challenge = await createCodeChallenge(verifier);

  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    scope: getScope(),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.assign(`${config.authorization_endpoint}?${params.toString()}`);
}

export async function handleOidcCallback(): Promise<TokenRecord | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    throw new Error(`OIDC error: ${error}`);
  }

  if (!code || !state) {
    return null;
  }

  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);

  if (!expectedState || state !== expectedState || !verifier) {
    throw new Error('OIDC state mismatch.');
  }

  const config = await discoverConfig();
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('OIDC client not configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    client_id: clientId,
    code_verifier: verifier,
  });

  const response = await fetch(config.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error('OIDC token exchange failed.');
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const expiresIn = data.expires_in ?? 3600;
  const record: TokenRecord = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  localStorage.setItem(TOKEN_KEY, JSON.stringify(record));
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.pathname);
  return record;
}

export function getAccessToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) {
    return null;
  }
  const record = JSON.parse(raw) as TokenRecord;
  if (!record.accessToken || Date.now() > record.expiresAt) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return record.accessToken;
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
