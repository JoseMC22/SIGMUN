"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = 'SIGMUN_AUTH';
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers['Cookie'] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function searchContribuyentesAction(
  filters: Record<string, any>,
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const body = { ...filters, page, pageSize };
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getContribuyenteAction(codigo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/${encodeURIComponent(codigo)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function saveContribuyenteAction(dto: Record<string, any>) {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/save', {
      method: 'POST',
      body: JSON.stringify(dto),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function deleteContribuyenteAction(codigo: string, motivo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/${encodeURIComponent(codigo)}`, {
      method: 'DELETE',
      body: JSON.stringify({ motivo }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }

    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function validateDniAction(numDoc: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/validar-dni/${encodeURIComponent(numDoc)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function searchViasAction(query: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/catalogos/search-vias?query=${encodeURIComponent(query)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}


export async function fetchTiposContribuyenteAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-contribuyente');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchSubtiposContribuyenteAction(idTipo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/catalogos/subtipos-contribuyente/${encodeURIComponent(idTipo)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchDistritosAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/distritos');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchViasAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/vias');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchMotivosActualizacionAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/motivos-actualizacion');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchDocumentosAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/documentos');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchTiposInteriorAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-interior');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchTiposEdificacionAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-edificacion');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchTiposIngresoAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-ingreso');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchTiposAgrupamientoAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-agrupamiento');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getSolicitudesAction(
  codigo: string,
  idSolicitud: string = '',
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const params = new URLSearchParams({
      id_solicitud: idSolicitud,
      page: String(page),
      pageSize: String(pageSize),
    });
    const response = await authFetch(
      `/impuesto-vehicular/registro-solicitud/solicitudes/${encodeURIComponent(codigo)}?${params}`,
    );
    if (!response.ok) return { success: false as const, error: `Error ${response.status}`, data: [], total: 0 };
    const result = await response.json();
    return { success: true as const, data: result.data ?? [], total: result.total ?? 0 };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión', data: [], total: 0 };
  }
}

export async function getSolicitudDetailAction(codigo: string, idSolicitud?: string) {
  try {
    const params = idSolicitud ? `?id_solicitud=${encodeURIComponent(idSolicitud)}` : '';
    const response = await authFetch(
      `/impuesto-vehicular/registro-solicitud/solicitud-detail/${encodeURIComponent(codigo)}${params}`,
    );
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function saveSolicitudAction(body: {
  codigo: string;
  id_solicitud?: string;
  petitorio: string;
  hecho: string;
  derecho: string;
  num_recibo: string;
  fecha_recibo: string;
  anio: string;
}) {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/solicitud/save', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getDJListadoAction(
  codigo: string,
  idSolicitud: string,
  criterio: string = '',
  page: number = 1,
  pageSize: number = 15,
) {
  try {
    const params = new URLSearchParams({
      id_solicitud: idSolicitud,
      criterio,
      page: String(page),
      pageSize: String(pageSize),
    });
    const response = await authFetch(
      `/impuesto-vehicular/registro-solicitud/dj-listado/${encodeURIComponent(codigo)}?${params}`,
    );
    if (!response.ok) return { success: false as const, error: `Error ${response.status}`, data: [], total: 0 };
    const result = await response.json();
    return { success: true as const, data: result.data ?? [], total: result.total ?? 0 };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión', data: [], total: 0 };
  }
}

export async function deleteSolicitudAction(idSolicitud: string) {
  try {
    const response = await authFetch(
      `/impuesto-vehicular/registro-solicitud/solicitud/${encodeURIComponent(idSolicitud)}`,
      { method: 'DELETE' },
    );
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getDJCombosAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/dj-combos');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function fetchTiposRelacionAction() {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/catalogos/tipos-relacion');
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getRepresentantesByContribuyenteAction(codigo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/representante/contribuyente/${encodeURIComponent(codigo)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function getRepresentanteAction(id: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/representante/${encodeURIComponent(id)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, data: result.data };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function saveRepresentanteAction(dto: Record<string, any>) {
  try {
    const isUpdate = !!dto.id_representante;
    const url = isUpdate
      ? `/impuesto-vehicular/registro-solicitud/representante/${encodeURIComponent(dto.id_representante)}`
      : '/impuesto-vehicular/registro-solicitud/representante';
    const response = await authFetch(url, {
      method: isUpdate ? 'PUT' : 'POST',
      body: JSON.stringify(dto),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function deleteRepresentanteAction(id: string, codigo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/representante/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ codigo }),
    });
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function verificarRepresentanteAction(codigo: string) {
  try {
    const response = await authFetch(`/impuesto-vehicular/registro-solicitud/representante/verificar/${encodeURIComponent(codigo)}`);
    if (!response.ok) return { success: false as const, error: `Error ${response.status}` };
    const result = await response.json();
    return { success: true as const, exists: result.exists };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function saveDJAction(body: {
  num_decla: string;
  anio_dj: string;
  id_solicitud: string;
  idcontrib: string;
  id_propiedad: string;
  id_vehiculo: string;
  base_imponible1: number;
  imp_anual1: number;
  anio1: string;
  base_imponible2: number;
  imp_anual2: number;
  anio2: string;
  base_imponible3: number;
  imp_anual3: number;
  anio3: string;
  id_tasa: string;
  fecha_decla: string;
  imprimir: string;
}) {
  try {
    const response = await authFetch('/impuesto-vehicular/registro-solicitud/dj/save', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
