const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  authenticated: true;
  user: {
    id: string;
    username: string;
    name: string;
    profileId: string;
    profileName: string;
    areaId: string;
    areaName: string;
    isEncargado: string;
    isRemoto: boolean | null;
  };
  sessionExpiresAt: string;
  message?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

export async function login(credentials: LoginRequest): Promise<{ data: LoginResponse; setCookie?: string | null }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message ?? 'Error de autenticación.';
    throw new ApiRequestError(message, response.status, data.error);
  }

  // Capturamos la cookie del backend para poder replicarla desde el servidor de Next.js
  const setCookie = response.headers.get('set-cookie');

  return { data: data as LoginResponse, setCookie };
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    // Envía la cookie de sesión automáticamente
    credentials: 'include',
  });
}

export function getStoredUser(): LoginResponse['user'] | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? (JSON.parse(user) as LoginResponse['user']) : null;
}

/**
 * Ahora solo guardamos los datos del usuario. 
 * El token es manejado por el navegador mediante cookies HttpOnly.
 */
export function storeAuth(user: LoginResponse['user']): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem('user');
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('sigmun_session');
  }
}

export interface MenuModuleData {
  id: string;
  title: string;
}

export interface MenuSubmenuData {
  id: string;
  title: string;
  path: string;
  icon: string;
  form: string;
}

export async function fetchModules(): Promise<MenuModuleData[]> {
  const response = await fetch(`${API_BASE_URL}/menu/modules`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiRequestError('Error al cargar módulos', response.status);
  const data = await response.json();
  return data.modules as MenuModuleData[];
}

export async function fetchAllowedPaths(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/menu/all`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiRequestError('Error al verificar permisos', response.status);
  const data = await response.json();
  return data.paths as string[];
}

export async function fetchSubmenus(moduleId: string): Promise<MenuSubmenuData[]> {
  const response = await fetch(`${API_BASE_URL}/menu/modules/${encodeURIComponent(moduleId)}/submenus`, {
    credentials: 'include',
  });
  if (!response.ok) throw new ApiRequestError('Error al cargar submenús', response.status);
  const data = await response.json();
  return data.submenus as MenuSubmenuData[];
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly errorType?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}
