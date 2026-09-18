"use server";

import { cookies } from "next/headers";

const AUTH_COOKIE_NAME = "SIGMUN_AUTH";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function authFetch(path: string, options?: RequestInit) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (authCookie) {
    headers["Cookie"] = `${AUTH_COOKIE_NAME}=${authCookie.value}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export interface TramiteBomberosRow {
  iCodTramite: number;
  cCodificacion: string;
  nro_tramite: string;
  ccodigo: string;
  codigo_contribuyente: string;
  cAsunto: string;
  cObservaciones: string;
  fFecRegistro: string;
  fFecDesde?: string;
  fFecHasta?: string;
  nombre_contribuyente: string;
  doc_contribuyente: string;
  cEstadoSolicitudLegal?: string;
}

export interface OficinaDestinoItem {
  cCodAreaDestino: string;
  cDetalleSolicitud?: string;
}

export interface CrearSolicitudPayload {
  iCodTramite: number;
  cCodificacion: string;
  ccodigo?: string;
  cObservacionLegal: string;
  fFecDesde?: string;
  fFecHasta?: string;
  iCodTrabajadorSolicita?: string;
  cCodAreaSolicita?: string;
  oficinasDestino: OficinaDestinoItem[];
}

export interface EstadoSolicitudRow {
  iCodSolicitud: number;
  iCodTramite: number;
  cCodificacion: string;
  ccodigo?: string;
  cObservacionLegal: string;
  fFecSolicitud: string;
  cEstadoCabecera: string;
  iCodSolicitudOficina: number;
  iCodOficina?: number;
  cCodAreaDestino: string;
  cDetalleSolicitud?: string;
  cEstadoOficina: string;
  nFlgEstado?: number;
  cNotaObservacion?: string;
  fFecEnvio: string;
  fFecRespuesta?: string;
  cRespuesta?: string;
  cNombreArchivo?: string;
  cRutaArchivo?: string;
  cUsuarioRespuesta?: string;
}

export async function fetchTramitesBomberos(
  fFecDesde?: string,
  fFecHasta?: string,
  ccodigo?: string,
  cCodificacion?: string,
  cEstadoLegal?: string
): Promise<TramiteBomberosRow[]> {
  const params = new URLSearchParams();
  if (fFecDesde) params.append("fFecDesde", fFecDesde);
  if (fFecHasta) params.append("fFecHasta", fFecHasta);
  if (ccodigo) params.append("ccodigo", ccodigo);
  if (cCodificacion) params.append("cCodificacion", cCodificacion);
  if (cEstadoLegal) params.append("cEstadoLegal", cEstadoLegal);

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await authFetch(`/asesoria-legal/tramites-bomberos${query}`);
  if (!res.ok) {
    throw new Error("Error al obtener trámites de Bomberos");
  }
  return res.json();
}

export async function crearSolicitudLegal(payload: CrearSolicitudPayload) {
  const res = await authFetch(`/asesoria-legal/solicitud`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al crear solicitud" }));
    throw new Error(err.message || "Error al crear solicitud");
  }
  return res.json();
}

export async function fetchEstadoSolicitudes(
  iCodTramite?: number,
  cCodificacion?: string,
  iCodOficina?: number
): Promise<EstadoSolicitudRow[]> {
  const params = new URLSearchParams();
  if (iCodTramite) params.append("iCodTramite", iCodTramite.toString());
  if (cCodificacion) params.append("cCodificacion", cCodificacion);
  if (iCodOficina) params.append("iCodOficina", iCodOficina.toString());

  const query = params.toString() ? `?${params.toString()}` : "";
  const res = await authFetch(`/asesoria-legal/solicitud/estado${query}`);
  if (!res.ok) {
    throw new Error("Error al consultar el estado de las solicitudes");
  }
  return res.json();
}

export async function responderSolicitudLegal(
  iCodSolicitudOficina: number,
  cRespuesta: string,
  cNombreArchivo?: string | null,
  cRutaArchivo?: string | null
) {
  const res = await authFetch(`/asesoria-legal/solicitud/respuesta`, {
    method: "POST",
    body: JSON.stringify({ iCodSolicitudOficina, cRespuesta, cNombreArchivo, cRutaArchivo }),
  });
  if (!res.ok) {
    throw new Error("Error al registrar la respuesta");
  }
  return res.json();
}

export async function actualizarSolicitudLegal(
  iCodSolicitud: number,
  cObservacionLegal?: string,
  oficinasDestino?: Array<{ cCodAreaDestino: string; cDetalleSolicitud: string }>
) {
  const res = await authFetch(`/asesoria-legal/solicitud/${iCodSolicitud}`, {
    method: "PUT",
    body: JSON.stringify({ cObservacionLegal, oficinasDestino }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al actualizar la solicitud" }));
    throw new Error(err.message || "Error al actualizar la solicitud");
  }
  return res.json();
}

export async function evaluarRespuestaOficinaAction(
  iCodSolicitudOficina: number,
  nFlgEstado: number,
  cNotaObservacion?: string
) {
  const res = await authFetch(`/asesoria-legal/solicitud-oficina/${iCodSolicitudOficina}/evaluar`, {
    method: "PUT",
    body: JSON.stringify({ nFlgEstado, cNotaObservacion }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al evaluar la respuesta" }));
    throw new Error(err.message || "Error al evaluar la respuesta");
  }
  return res.json();
}

export interface HistorialRespuestaRow {
  iCodRespuesta: number;
  iCodSolicitudOficina: number;
  fFecRespuesta: string;
  cRespuesta: string;
  cNombreArchivo?: string;
  cRutaArchivo?: string;
  cUsuarioRespuesta?: string;
}

export async function fetchHistorialRespuestasAction(iCodSolicitudOficina: number): Promise<HistorialRespuestaRow[]> {
  const res = await authFetch(`/asesoria-legal/solicitud-oficina/${iCodSolicitudOficina}/historial`);
  if (!res.ok) {
    throw new Error("Error al obtener el historial de respuestas");
  }
  return res.json();
}

