"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function fetchModulesAction() {
  const response = await authFetch('/menu/modules', { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json();
  return data.modules as Array<{ id: string; title: string }>;
}

export async function fetchSubmenusAction(moduleId: string) {
  const response = await authFetch(
    `/menu/modules/${encodeURIComponent(moduleId)}/submenus`,
    { cache: 'no-store' },
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.submenus as Array<{ id: string; title: string; path: string; icon: string; form: string }>;
}

export async function fetchAllowedPathsAction() {
  const response = await authFetch('/menu/all', { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json();
  return data.paths as string[];
}
