import type { ApiError } from '../types';
import { prepareUploadFile } from '../utils/prepareUploadFile';

const AUTH_STORAGE_KEY = 'nsms_auth';

export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler) {
  onUnauthorized = handler;
}

export function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth | null) {
  if (auth) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export class ApiClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as ApiError;
    return data.message || response.statusText;
  } catch {
    return response.statusText || 'Request failed';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  skipAuth = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const auth = getStoredAuth();
    if (auth?.accessToken) {
      headers.set('Authorization', `Bearer ${auth.accessToken}`);
    }
  }

  const response = await fetch(path, { ...options, headers });

  if (response.status === 401 && !skipAuth) {
    setStoredAuth(null);
    onUnauthorized?.();
    throw new ApiClientError('Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiClientError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function uploadAuthHeaders(): Headers {
  const headers = new Headers();
  const auth = getStoredAuth();
  if (auth?.accessToken) {
    headers.set('Authorization', `Bearer ${auth.accessToken}`);
  }
  return headers;
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  return false;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function apiPostForm<T>(
  path: string,
  fields: Record<string, string>,
  file?: File,
  fileFieldName = 'file',
): Promise<T> {
  const prepared = file ? await prepareUploadFile(file) : undefined;
  if (prepared && prepared.size > 1024 * 1024) {
    throw new ApiClientError('File must be 1 MB or smaller.', 400);
  }

  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  if (prepared) body.append(fileFieldName, prepared);

  const response = await fetch(path, { method: 'POST', headers: uploadAuthHeaders(), body });

  if (response.status === 401) {
    setStoredAuth(null);
    onUnauthorized?.();
    throw new ApiClientError('Session expired. Please log in again.', 401);
  }

  if (!response.ok) {
    const message = await parseError(response);
    throw new ApiClientError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function apiUpload<T>(path: string, file: File, fieldName = 'file'): Promise<T> {
  const prepared = await prepareUploadFile(file);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const body = new FormData();
    body.append(fieldName, prepared);
    try {
      const response = await fetch(path, { method: 'POST', headers: uploadAuthHeaders(), body });

      if (response.status === 401) {
        setStoredAuth(null);
        onUnauthorized?.();
        throw new ApiClientError('Session expired. Please log in again.', 401);
      }

      if (!response.ok) {
        const message = await parseError(response);
        throw new ApiClientError(message, response.status);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError) throw error;
      if (attempt === 0 && isNetworkFailure(error)) {
        await sleep(600);
        continue;
      }
      break;
    }
  }

  if (isNetworkFailure(lastError)) {
    throw new ApiClientError(
      'Upload could not reach the server. Confirm Docker is running, then hard-refresh this page (Ctrl+Shift+R).',
      0,
    );
  }

  throw lastError instanceof Error ? lastError : new ApiClientError('Upload failed.', 0);
}

export const api = {
  get: <T>(path: string, skipAuth = false) => apiRequest<T>(path, {}, skipAuth),
  post: <T>(path: string, body: unknown, skipAuth = false) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }, skipAuth),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
};
