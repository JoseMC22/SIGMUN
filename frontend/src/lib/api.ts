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

const PC_NAME_KEY = 'sigmun_pc_name';
const PC_NAME_MANUAL_KEY = 'sigmun_pc_name_manual';

/** Hostnames que NO son nombres reales de PC */
const INVALID_HOSTNAMES = new Set([
  'GATEWAY', 'ROUTER', 'MODEM', 'LOCALHOST', 'UNKNOWN',
  'WORKGROUP', 'MINWINPC', '(UNKNOWN)', '',
]);

function isValidPcName(name: string): boolean {
  if (!name || !name.trim()) return false;
  const upper = name.toUpperCase().trim();
  if (INVALID_HOSTNAMES.has(upper)) return false;
  // Rechazar si es solo una IP
  if (/^\d+\.\d+\.\d+\.\d+$/.test(upper)) return false;
  // Rechazar si tiene caracteres sospechosos
  if (/[^A-Z0-9\-_]/.test(upper)) return false;
  return true;
}

/**
 * Obtiene el nombre de la PC.
 *
 * Precedencia (el backend es la fuente autoritativa):
 *   1. Backend (`GET /auth/client-info`), que resuelve el hostname de esta máquina.
 *   2. Override manual del usuario — solo si la detección falla.
 *   3. Cache de sesiones anteriores.
 *
 * Nota honesta: isValidPcName() solo rechaza basura evidente (GATEWAY, una IP,
 * 'a b', etc.); un valor como 'info' es sintácticamente válido y esta
 * validación NO puede detectarlo. Lo que neutraliza ese valor contaminado es
 * que el server resuelva el hostname real (INFOSAT01) y gane la precedencia.
 */
export async function fetchPcName(): Promise<string> {
  if (typeof window === 'undefined') return '';

  // 1) Authoritative source: the backend resolves this machine's hostname.
  // A previously stored value must NEVER win over a successful resolution:
  // the cache is only rewritten when it is invalid, so a stale-but-valid
  // value (e.g. 'info') would otherwise be trusted forever and silently
  // corrupt the audit trail (caja.mrecibos.estacion).
  try {
    const response = await fetch(`${API_BASE_URL}/auth/client-info`, { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.hostname && isValidPcName(data.hostname)) {
        localStorage.setItem(PC_NAME_KEY, data.hostname);
        return data.hostname;
      }
    }
  } catch {
    // Backend unreachable — fall through to the locally stored values.
  }

  // 2) Manual override: only a fallback for when detection fails.
  const manual = localStorage.getItem(PC_NAME_MANUAL_KEY);
  if (manual && isValidPcName(manual)) return manual.trim();
  if (manual) {
    console.warn(`[api] El nombre de PC manual guardado ("${manual}") no es válido; se ignora.`);
  }

  // 3) Cache.
  const cached = localStorage.getItem(PC_NAME_KEY);
  if (cached && isValidPcName(cached)) return cached;
  if (cached) localStorage.removeItem(PC_NAME_KEY);

  return '';
}

/**
 * Configura el nombre de la PC manualmente y lo persiste en localStorage.
 */
export function setPcName(name: string): void {
  if (typeof window !== 'undefined') {
    if (name && name.trim()) {
      localStorage.setItem(PC_NAME_MANUAL_KEY, name.trim());
    } else {
      localStorage.removeItem(PC_NAME_MANUAL_KEY);
    }
  }
}

/**
 * Versión síncrona — retorna el valor de localStorage.
 * Solo devuelve valores que pasan `isValidPcName`; cualquier valor crudo
 * (p. ej. un manual inválido como una IP o 'GATEWAY') se descarta en lectura
 * en vez de propagarse a la auditoría (`caja.mrecibos.estacion`).
 */
export function getPcName(): string {
  if (typeof window === 'undefined') return '';
  const manual = localStorage.getItem(PC_NAME_MANUAL_KEY);
  if (manual && isValidPcName(manual)) return manual;
  const cached = localStorage.getItem(PC_NAME_KEY);
  if (cached && isValidPcName(cached)) return cached;
  return '';
}

/**
 * Limpia el cache de PC name (útil al cerrar sesión).
 */
export function clearPcNameCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(PC_NAME_KEY);
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
