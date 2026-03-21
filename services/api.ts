import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('auth_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isFormData = false
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  const url = `${API_BASE_URL}${path}`;
  console.log(`[API] ${options.method || 'GET'} ${url}`);

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (networkErr: any) {
    console.error(`[API] Network error for ${url}:`, networkErr?.message);
    throw new Error(`Cannot reach server at ${url}. Is the backend running?`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned non-JSON response (status ${res.status})`);
  }

  console.log(`[API] ${res.status} ${url}`, data);

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, body: object) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: object) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  putForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'PUT', body: formData }, true),

  postForm: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }, true),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  deleteWithBody: <T>(path: string, body: object) =>
    request<T>(path, { method: 'DELETE', body: JSON.stringify(body) }),
};
