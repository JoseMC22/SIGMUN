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

// ── Nueva Infracción ──────────────────────────────────────

export interface NuevaInfraccionData {
  operacion?: number;
  placa: string;
  seriePapel?: string;
  numeroPapel?: string;
  taloPapel?: string;
  oficio?: string;
  fechaAplicacion: string;
  horaMin?: string;
  codigoInfraccion: string;
  importe: number;
  detalleInfraccion?: string;
  dosaje?: string;
  grado?: string;
  retener?: number;
  idLugar?: string;
  lugar?: string;
  referencia?: string;
  codigoPropietario?: string;
  presento?: number;
  nombrePropietario?: string;
  tipoProp?: string;
  direccionProp?: string;
  codigoConductor?: string;
  nombreConductor?: string;
  licenciaConductor?: string;
  direccionConductor?: string;
  idPlaca?: string;
  cipAuto?: string;
  detalle?: string;
  papeleta?: string;
  responsable?: string;
  numeroInfraccion?: string;
  resolucion?: string;
  observaResolucion?: string;
  fechaResolucion?: string;
  meses?: string;
}

export async function nuevaInfraccionAction(data: NuevaInfraccionData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/nueva-infraccion", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Generar Gravamen ──────────────────────────────────────

export interface GenerarGravamenData {
  ninfrac: string;
  numingr?: string;
  operador: string;
}

export async function generarGravamenAction(data: GenerarGravamenData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/generar-gravamen", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Generar Certificado No Adeudo ─────────────────────────

export interface GenerarNoAdeudoData {
  ninfrac: string;
  numingr: string;
  operador?: string;
}

export async function generarNoAdeudoAction(data: GenerarNoAdeudoData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/generar-no-adeudo", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Gravamen Sin Placa (botón toolbar) ───────────────────
// SP: papeleta.sp_Imprime_Certificadogravamensinplaca (@buscar=3, @codplaca)

export async function gravamenSinPlacaAction(codplaca: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/gravamen-sin-placa", {
      method: "POST",
      body: JSON.stringify({ codplaca }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export async function generarGravamenSinPlacaAction(codplaca: string, numingr: string, operador = "ESTACION/ADMIN") {
  try {
    const response = await authFetch("/papeleta-transito/acciones/generar-gravamen-sin-placa", {
      method: "POST",
      body: JSON.stringify({ codplaca, numingr, operador }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Imprimir Record Pendiente ─────────────────────────────

export interface ImprimirRecordData {
  placa: string;
  conductor?: string;
  dni?: string;
  estado?: string;
}

export async function imprimirRecordPendienteAction(data: ImprimirRecordData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/imprimir-record-pendiente", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Verificar Condición Fraccionamiento ───────────────────

export async function verificarCondicionFraccionamientoAction(codigo: string, param: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/verificar-condicion-fraccionamiento", {
      method: "POST",
      body: JSON.stringify({ codigo, param }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Calcular Cuotas ──────────────────────────────────────

export interface CalcularCuotasData {
  cuotas: number;
  totalDeuda: number;
  totalInicial: number;
  fecGen: string;
  fecCuo: string;
}

export async function calcularCuotasAction(data: CalcularCuotasData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/calcular-cuotas", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Fraccionar Papeleta ───────────────────────────────────

export interface FraccionarPapeletaData {
  codigo: string;
  cuotas: number;
  totalDeuda: number;
  totalInicial: number;
  fechaGeneracion: string;
  fechaCuota: string;
  condicionId?: string;
  tipoDeuda?: string;
  codResp?: string;
  codPropVeh?: string;
  varxml?: string;
}

export async function fraccionarPapeletaAction(data: FraccionarPapeletaData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/fraccionar-papeleta", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Ver Fraccionamiento ───────────────────────────────────

export async function verFraccionamientoAction(codigo: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/ver-fraccionamiento", {
      method: "POST",
      body: JSON.stringify({ codigo }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export async function resolucionFraccionamientoAction(codigo: string, convenio: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/resolucion-fraccionamiento", {
      method: "POST",
      body: JSON.stringify({ codigo, convenio }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Cargar Detalle Infracción ─────────────────────────────

export async function cargarDetalleInfraccionAction(ninfrac: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/cargar-detalle-infraccion", {
      method: "POST",
      body: JSON.stringify({ ninfrac }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Buscar Resolución de Sanción ──────────────────────────

export async function buscarResolucionSancionAction(ninfrac: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/buscar-resolucion-sancion", {
      method: "POST",
      body: JSON.stringify({ ninfrac }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Grabar Resolución de Sanción ──────────────────────────

export interface GrabarResolucionData {
  ninfrac: string;
  numero?: string;
  fecha?: string;
  obs?: string;
}

export async function grabarResolucionSancionAction(data: GrabarResolucionData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grabar-resolucion-sancion", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Listar Estados ────────────────────────────────────────

export async function listarEstadosAction() {
  try {
    const response = await authFetch("/papeleta-transito/acciones/listar-estados", {
      method: "GET",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Buscar Cambio de Estado ───────────────────────────────

export async function buscarCambioEstadoAction(ninfrac: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/buscar-cambio-estado", {
      method: "POST",
      body: JSON.stringify({ ninfrac }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Grabar Cambio de Estado ───────────────────────────────

export interface GrabarCambioEstadoData {
  ninfrac: string;
  tipoestado: string;
  numero?: string;
  fecha?: string;
  obs?: string;
}

export async function grabarCambioEstadoAction(data: GrabarCambioEstadoData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grabar-cambio-estado", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Generar Liquidación (Estado de Cuenta) ────────────────

export interface GenerarLiquidacionData {
  codigo: string;
  infraccion: string;
  usuario?: string;
  idrecibo?: string;
}

export async function generarLiquidacionAction(data: GenerarLiquidacionData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/generar-liquidacion", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Búsquedas (lookup panels) ─────────────────────────────

export interface ConsultaPropietarioParams {
  propieta?: string;
  page?: number;
  limit?: number;
}

export async function consultaPropietarioAction(params: ConsultaPropietarioParams) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-propietario", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface ConsultaConductorParams {
  conductor?: string;
  dni?: string;
  page?: number;
  limit?: number;
}

export async function consultaConductorAction(params: ConsultaConductorParams) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-conductor", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface ConsultaPlacaParams {
  placa?: string;
  page?: number;
  limit?: number;
}

export async function consultaPlacaAction(params: ConsultaPlacaParams) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-placa", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface ConsultaPoliciaParams {
  cip?: string;
  page?: number;
  limit?: number;
}

export async function consultaPoliciaAction(params: ConsultaPoliciaParams) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-policia", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface ConsultaLugarParams {
  cmbtipolugar?: string;
  nlugar?: string;
  cmbtipocalle?: string;
  ncalle?: string;
  page?: number;
  limit?: number;
}

export async function consultaLugarAction(params: ConsultaLugarParams) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-lugar", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Envío a Coactivo ──────────────────────────────────────

export async function buscarEnvioCoactivoAction(ninfrac: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/buscar-envio-coactivo", {
      method: "POST",
      body: JSON.stringify({ ninfrac }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface GrabarEnvioCoactivoData {
  ninfrac: string;
  observacion?: string;
}

export async function grabarEnvioCoactivoAction(data: GrabarEnvioCoactivoData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grabar-envio-coactivo", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Eliminar Papeleta ─────────────────────────────────────

export async function eliminarPapeletaAction(idPapeleta: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/eliminar-papeleta", {
      method: "POST",
      body: JSON.stringify({ idPapeleta }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Validar Placa ─────────────────────────────────────────

export async function validarPlacaAction(placa: string) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/validar-placa", {
      method: "POST",
      body: JSON.stringify({ placa }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Grabar Conductor / Propietario (Persona Nuevo Ingreso) ──

export interface GrabarConProData {
  /** Tipo de documento (DNI/RUC/CE) — mapea al @tipoing del SP nuevoingreso */
  tipoPer?: string;
  /** Tipo de persona (@tipoper): '1' natural, '2' jurídica */
  cmbTipoPer?: string;
  apPaterno: string;
  apMaterno: string;
  nombres: string;
  dniRuc: string;
  licencia?: string;
  tarjeta?: string;
  domicilio?: string;
  numero?: string;
  manzana?: string;
  lote?: string;
  idLugar?: string;
  idConductor?: string;
  email?: string;
}

export async function grabarConProAction(data: GrabarConProData) {
  try {
    // Mapea los nombres públicos al formato esperado por el SP papeleta.nuevoingreso
    // (prefijo txt*, igual que el PHP legacy grabarconproAction).
    const body = {
      tipoper: data.tipoPer ?? "DNI",
      cmbtipoper: data.cmbTipoPer ?? "1",
      txtaprz: data.apPaterno ?? "",
      txtapmater: data.apMaterno ?? "",
      txtnombre: data.nombres ?? "",
      txtdniruc: data.dniRuc ?? "",
      txtnlicencia: data.licencia ?? "",
      txtntarjeta: data.tarjeta ?? "",
      txtdomicilio: data.domicilio ?? "",
      txtdnumero: data.numero ?? "",
      txtdmanzana: data.manzana ?? "",
      txtdlote: data.lote ?? "",
      txtidlugar: data.idLugar ?? "",
      idconductor: data.idConductor ?? "",
      txtemail: data.email ?? "",
    };
    const response = await authFetch("/papeleta-transito/acciones/grabar-conpro", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Grabar Junta y Calle / Vía ────────────────────────────

export interface GrabarJucaData {
  tipoCalle?: string;
  nombreCalle: string;
  tipoLugar?: string;
  nombreLugar: string;
}

export async function grabarJucaAction(data: GrabarJucaData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grabar-juca", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Consulta Infracciones (Escala de Multas) ──────────────

export interface ConsultaInfraccionesParams {
  busqueda?: string;
  page?: number;
  limit?: number;
}

export async function consultaInfraccionesAction(params: ConsultaInfraccionesParams = {}) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/consulta-infracciones", {
      method: "POST",
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export async function obtenerCombosLugarAction() {
  try {
    const response = await authFetch("/papeleta-transito/acciones/combos-lugar", {
      method: "GET",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Combos y Grabado de Placa ─────────────────────────────

export interface ComboPlacaItem {
  id: string;
  descripcion: string;
}

export interface CombosPlacaData {
  tipos: ComboPlacaItem[];
  marcas: ComboPlacaItem[];
  colores: ComboPlacaItem[];
}

export async function obtenerCombosPlacaAction() {
  try {
    const response = await authFetch("/papeleta-transito/acciones/combos-placa", {
      method: "GET",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export interface GrabarPlacaData {
  mquery?: number;
  idtramplac?: number;
  codplac: string;
  codplac1?: string;
  tipvehi?: string;
  codmarc?: string;
  codcolo?: string;
  aniofab?: string;
  formalidad?: string;
  codigo?: string;
  estado?: string;
  usuario?: string;
  estacion?: string;
  fechIngreso?: string;
}

export async function grabarPlacaAction(data: GrabarPlacaData) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grabar-placa", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: err.message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

// ── Importar Excel ────────────────────────────────────────

export interface ImportarExcelRegistro {
  id?: string;
  licencia?: string;
  conductor?: string;
  doc?: string;
  domicilio?: string;
  fecha?: string;
  papeleta?: string;
  infracc?: string;
  placa?: string;
  marca?: string;
  oficio?: string;
}

/** Carga el grid de registros ya importados desde la tabla temporal (SP @buscar=2). */
export async function gridImportarExcelAction(): Promise<
  { success: true; data: ImportarExcelRegistro[] } | { success: false; error: string }
> {
  try {
    const response = await authFetch("/papeleta-transito/acciones/grid-importar-excel", {
      method: "GET",
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: (err as { message?: string }).message ?? `Error ${response.status}` };
    }
    const json = await response.json();
    return { success: true as const, data: (json.data ?? []) as ImportarExcelRegistro[] };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}

export async function importarExcelAction(registros: ImportarExcelRegistro[]) {
  try {
    const response = await authFetch("/papeleta-transito/acciones/importar-excel", {
      method: "POST",
      body: JSON.stringify({ registros }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { success: false as const, error: (err as { message?: string }).message ?? `Error ${response.status}` };
    }
    return { success: true as const, ...(await response.json()) };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Error de conexión" };
  }
}
