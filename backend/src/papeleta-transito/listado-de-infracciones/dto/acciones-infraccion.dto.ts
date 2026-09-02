import { z } from 'zod';

// ── Nueva Infracción ──────────────────────────────────────
export const NuevaInfraccionSchema = z.object({
  operacion: z.coerce.number().int().min(0).max(1).default(0),
  placa: z.string().min(1, 'Placa es requerida'),
  seriePapel: z.string().default(''),
  numeroPapel: z.string().default(''),
  taloPapel: z.string().default('01'),
  oficio: z.string().default(''),
  fechaAplicacion: z.string().min(1, 'Fecha es requerida'),
  horaMin: z.string().default(''),
  codigoInfraccion: z.string().min(1, 'Código de infracción es requerido'),
  importe: z.coerce.number().min(0),
  detalleInfraccion: z.string().default(''),
  dosaje: z.string().default(''),
  grado: z.string().default(''),
  retener: z.coerce.number().int().min(0).max(1).default(0),
  idLugar: z.string().default(''),
  lugar: z.string().default(''),
  referencia: z.string().default(''),
  codigoPropietario: z.string().default(''),
  presento: z.coerce.number().int().min(0).max(1).default(0),
  nombrePropietario: z.string().default(''),
  tipoProp: z.string().default(''),
  direccionProp: z.string().default(''),
  codigoConductor: z.string().default(''),
  nombreConductor: z.string().default(''),
  licenciaConductor: z.string().default(''),
  direccionConductor: z.string().default(''),
  idPlaca: z.string().default(''),
  cipAuto: z.string().default(''),
  detalle: z.string().default(''),
  papeleta: z.string().default(''),
  responsable: z.string().default('C'),
  numeroInfraccion: z.string().default(''),
  resolucion: z.string().optional(),
  observaResolucion: z.string().optional(),
  fechaResolucion: z.string().optional(),
  meses: z.string().optional(),
});

export type NuevaInfraccionDto = z.infer<typeof NuevaInfraccionSchema>;

// ── Generar Gravamen ──────────────────────────────────────
export const GenerarGravamenSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  numingr: z.string().default(''),
  operador: z.string().min(1, 'Operador es requerido'),
});

export type GenerarGravamenDto = z.infer<typeof GenerarGravamenSchema>;

// ── Generar Certificado No Adeudo ─────────────────────────
export const GenerarNoAdeudoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  numingr: z.string().min(1, 'N° de recibo es requerido'),
  operador: z.string().default('ESTACION/ADMIN'),
});

export type GenerarNoAdeudoDto = z.infer<typeof GenerarNoAdeudoSchema>;

// ── Gravamen Sin Placa (botón toolbar) ───────────────────
export const GravamenSinPlacaSchema = z.object({
  codplaca: z.string().min(1, 'La placa es requerida'),
});

export type GravamenSinPlacaDto = z.infer<typeof GravamenSinPlacaSchema>;

// ── Imprimir Record Pendiente ─────────────────────────────
export const ImprimirRecordPendienteSchema = z.object({
  placa: z.string().min(1, 'Placa es requerida'),
  conductor: z.string().default(''),
  dni: z.string().default(''),
  estado: z.string().default(''),
});

export type ImprimirRecordPendienteDto = z.infer<typeof ImprimirRecordPendienteSchema>;

// ── Fraccionar Papeleta ───────────────────────────────────
export const FraccionarPapeletaSchema = z.object({
  codigo: z.string().min(1, 'Código contribuyente es requerido'),
  cuotas: z.coerce.number().int().min(2, 'Mínimo 2 cuotas').max(60),
  totalDeuda: z.coerce.number().min(0.01, 'Deuda debe ser mayor a 0'),
  totalInicial: z.coerce.number().min(0),
  fechaGeneracion: z.string().min(1),
  fechaCuota: z.string().min(1),
  condicionId: z.string().default(''),
  tipoDeuda: z.string().default('PIT'),
  codResp: z.string().default(''),
  codPropVeh: z.string().default(''),
  varxml: z.string().default(''),
});

export type FraccionarPapeletaDto = z.infer<typeof FraccionarPapeletaSchema>;

// ── Ver Fraccionamiento ───────────────────────────────────
export const VerFraccionamientoSchema = z.object({
  codigo: z.string().min(1, 'Código contribuyente es requerido'),
});

export type VerFraccionamientoDto = z.infer<typeof VerFraccionamientoSchema>;

// ── Importar Excel ────────────────────────────────────────
export const ImportarExcelSchema = z.object({
  registros: z.array(z.object({
    id: z.string().optional(),
    licencia: z.string().optional(),
    conductor: z.string().optional(),
    doc: z.string().optional(),
    domicilio: z.string().optional(),
    fecha: z.string().optional(),
    papeleta: z.string().optional(),
    infracc: z.string().optional(),
    placa: z.string().optional(),
    marca: z.string().optional(),
    oficio: z.string().optional(),
  })).min(1, 'Debe haber al menos un registro'),
});

export type ImportarExcelDto = z.infer<typeof ImportarExcelSchema>;

// ── Cargar Detalle Infracción ─────────────────────────────
export const CargarDetalleInfraccionSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
});

export type CargarDetalleInfraccionDto = z.infer<typeof CargarDetalleInfraccionSchema>;

// ── Buscar Resolución de Sanción ──────────────────────────
export const BuscarResolucionSancionSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
});

export type BuscarResolucionSancionDto = z.infer<typeof BuscarResolucionSancionSchema>;

// ── Grabar Resolución de Sanción ──────────────────────────
export const GrabarResolucionSancionSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  numero: z.string().default(''),
  fecha: z.string().default(''),
  obs: z.string().default(''),
});

export type GrabarResolucionSancionDto = z.infer<typeof GrabarResolucionSancionSchema>;

// ── Buscar Cambio de Estado ───────────────────────────────
export const BuscarCambioEstadoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
});

export type BuscarCambioEstadoDto = z.infer<typeof BuscarCambioEstadoSchema>;

// ── Grabar Cambio de Estado ───────────────────────────────
export const GrabarCambioEstadoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  tipoestado: z.string().min(1, 'Estado es requerido'),
  numero: z.string().default(''),
  fecha: z.string().default(''),
  obs: z.string().default(''),
});

export type GrabarCambioEstadoDto = z.infer<typeof GrabarCambioEstadoSchema>;

// ── Generar Liquidación (Estado de Cuenta) ────────────────
export const GenerarLiquidacionSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  infraccion: z.string().min(1, 'Infracción es requerida'),
  usuario: z.string().default(''),
  idrecibo: z.string().default(''),
});

export type GenerarLiquidacionDto = z.infer<typeof GenerarLiquidacionSchema>;

// ── Response types ────────────────────────────────────────
export interface RecordPendienteRow {
  papeleta: string;
  placa: string;
  infraccion: string;
  fecha: string;
  infractor: string;
  propietario: string;
  valor: number;
  descuento: number;
  total: number;
  codigo: string;
}

export interface RecordPendienteData {
  rows: RecordPendienteRow[];
  totalDescuento: number;
  totalCostas: number;
  importeTotal: number;
}

export interface FraccionamientoRow {
  cuota: string;
  anno: string;
  totalDeuda: string;
  cuotaIni: string;
  saldoDeuda: string;
  montoCuota: string;
  intereses: string;
  cuotaTotal: string;
  totalFrac: string;
  cuotas: string;
  fecGen: string;
}

export interface ImportarResult {
  exitosos: number;
  fallidos: number;
  mensajes: string[];
}

// ── Búsqueda de Propietario ───────────────────────────────
export const ConsultaPropietarioSchema = z.object({
  propieta: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ConsultaPropietarioDto = z.infer<typeof ConsultaPropietarioSchema>;

export interface PropietarioRow {
  idpropie: string;
  propietario: string;
  docu: string;
  tarjeta: string;
  direccion: string;
}

// ── Búsqueda de Conductor ─────────────────────────────────
export const ConsultaConductorSchema = z.object({
  conductor: z.string().default(''),
  dni: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ConsultaConductorDto = z.infer<typeof ConsultaConductorSchema>;

export interface ConductorRow {
  idconduc: string;
  conductor: string;
  docu: string;
  licencia: string;
  direccion: string;
}

// ── Búsqueda de Placa ─────────────────────────────────────
export const ConsultaPlacaSchema = z.object({
  placa: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ConsultaPlacaDto = z.infer<typeof ConsultaPlacaSchema>;

export interface PlacaRow {
  idtramplac: string;
  codplac: string;
  codplacSec: string;
  tipvehi: string;
  codmarc: string;
  codcolo: string;
  desvehi: string;
  desmarc: string;
  aniofab: string;
  descolor: string;
}

// ── Búsqueda de Policía ───────────────────────────────────
export const ConsultaPoliciaSchema = z.object({
  cip: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ConsultaPoliciaDto = z.infer<typeof ConsultaPoliciaSchema>;

export interface PoliciaRow {
  id: string;
  ncip: string;
  datos: string;
}

// ── Búsqueda de Lugar ─────────────────────────────────────
export const ConsultaLugarSchema = z.object({
  cmbtipolugar: z.string().default(''),
  nlugar: z.string().default(''),
  cmbtipocalle: z.string().default(''),
  ncalle: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type ConsultaLugarDto = z.infer<typeof ConsultaLugarSchema>;

export interface LugarRow {
  id: string;
  tvia: string;
  via: string;
  tlugar: string;
  lugar: string;
}

export interface SearchPagedResult<T> {
  total: number;
  rows: T[];
}

// ── Envío a Coactivo ──────────────────────────────────────
export const BuscarEnvioCoactivoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
});

export type BuscarEnvioCoactivoDto = z.infer<typeof BuscarEnvioCoactivoSchema>;

export const GrabarEnvioCoactivoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  observacion: z.string().default(''),
});

export type GrabarEnvioCoactivoDto = z.infer<typeof GrabarEnvioCoactivoSchema>;

// ── Búsqueda de Infracciones / Escala de Multas ───────────
export const ConsultaInfraccionesSchema = z.object({
  busqueda: z.string().default(''),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(15),
});

export type ConsultaInfraccionesDto = z.infer<typeof ConsultaInfraccionesSchema>;

export interface InfraccionMultaRow {
  id: string;
  codigo: string;
  tenor: string;
  porcentaje: string;
  vehiculo: string;
  uit: string;
  monto: string;
}

// ── Reporte: Datos Estado de Cuenta ──────────────────────
export const ReporteEstadoCuentaSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  codigo: z.string().default(''),
  placa: z.string().default(''),
  conductor: z.string().default(''),
  dni: z.string().default(''),
  estado: z.string().default(''),
});

export type ReporteEstadoCuentaDto = z.infer<typeof ReporteEstadoCuentaSchema>;

// ── Reporte: Datos Certificado No Adeudo ─────────────────
export const ReporteCertificadoNoAdeudoSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  numingr: z.string().min(1, 'N° de recibo es requerido'),
  operador: z.string().default('SISTEMA'),
});

export type ReporteCertificadoNoAdeudoDto = z.infer<typeof ReporteCertificadoNoAdeudoSchema>;

// ── Reporte: Datos Certificado Gravamen ──────────────────
export const ReporteGravamenSchema = z.object({
  ninfrac: z.string().min(1, 'N° de infracción es requerido'),
  numingr: z.string().min(1, 'N° de recibo es requerido'),
  operador: z.string().default('SISTEMA'),
});

export type ReporteGravamenDto = z.infer<typeof ReporteGravamenSchema>;

// ── Reporte: Datos Resolución de Sanción ─────────────────
export const ReporteResolucionSancionSchema = z.object({
  idtramctas: z.string().min(1, 'ID de tramitación es requerido'),
  usuario: z.string().default('SISTEMA'),
  estacion: z.string().default('SIGMUN-API'),
});

export type ReporteResolucionSancionDto = z.infer<typeof ReporteResolucionSancionSchema>;
