import { z } from 'zod';

/**
 * Fraccionar Deuda — DTOs.
 *
 * El legado (Zend PHP) implementaba el fraccionamiento en 3 endpoints:
 *  - condicionfrac    → [Rentas].[CondicionConvenio] @busc=1, @codigo, @param
 *                       (devuelve string '*' con 6 partes: estado | porc_fracc |
 *                        monto_min | porc_ini | max_cuotas | condicion_id)
 *  - fraccionar/index → dbo.sp_getfecha + cálculo de porcen_inicial, monto
 *                       inicial, saldo, max_cuotas según (estado, param)
 *  - muestracuotas    → Rentas.CuotasConvenio @cuotas, @total_deuda,
 *                       @total_inici, @fec_gen, @fec_cuo
 *
 * Los DTOs siguientes son el espejo minimal en Nest/Next.
 */

// ── 1) condicion ─────────────────────────────────────────────────────────
export const CondicionConvenioSchema = z.object({
  /** Código del contribuyente (varchar(7)). */
  codigo: z
    .string()
    .min(1, 'El código del contribuyente es obligatorio.')
    .max(7, 'El código no puede superar los 7 caracteres.'),
  /**
   * Param del fraccionamiento. Legado: 1 = ordinario, 2 = beneficio
   * arbitrios (casa habitación 10%). Por ahora siempre llega '1' desde
   * el frontend; el flujo param=2 se cablea cuando se implemente
   * "Mostrar Benef. Fracc." en el toolbar.
   */
  param: z.string().min(1, 'El parámetro es obligatorio.'),
});
export type CondicionConvenioDto = z.infer<typeof CondicionConvenioSchema>;

// ── 2) datos iniciales del modal (sp_getfecha + cálculo) ────────────────
export const FraccionarInicialSchema = z.object({
  codigo: z.string().min(1),
  totalpagar: z.union([z.string(), z.number()]).transform((v) =>
    Number(String(v).replace(',', '')),
  ),
  param: z.string().min(1),
  /** porc_ini viene de la condicion; el cálculo depende de estado/param. */
  porc_ini: z.string().optional().default(''),
  max_cuotas: z.string().optional().default(''),
  condicion_id: z.string().optional().default(''),
  estado: z.string().optional().default(''),
  /** IP | ARB | VEH | MUL (resultado de la validación del frontend). */
  tipo_deuda: z.string().optional().default(''),
});
export type FraccionarInicialDto = z.infer<typeof FraccionarInicialSchema>;

// ── 3) cálculo de cuotas ────────────────────────────────────────────────
export const FraccionarCuotasSchema = z.object({
  cuotas: z.number().int().min(1, 'La cantidad de cuotas debe ser ≥ 1.'),
  total_deuda: z.union([z.string(), z.number()]).transform((v) =>
    Number(String(v).replace(',', '')),
  ),
  total_inici: z.union([z.string(), z.number()]).transform((v) =>
    Number(String(v).replace(',', '')),
  ),
  fec_gen: z.string().min(1, 'La fecha de generación es obligatoria.'),
  fec_cuo: z.string().min(1, 'La fecha de primera cuota es obligatoria.'),
});
export type FraccionarCuotasDto = z.infer<typeof FraccionarCuotasSchema>;

// ── 4) simulación de convenio (GeneraConvenio_simulado_*) ────────────────

/** Tolerante a strings numéricos: el frontend puede mandarlos como string. */
const num = z.union([z.string(), z.number()]).transform((v) =>
  Number(String(v).replace(',', '')) || 0,
);
const str = z
  .union([z.string(), z.number()])
  .transform((v) => String(v ?? '').trim());

/**
 * Un recibo seleccionado de la deuda (mirror de la fila legacy xgridRecContri).
 * Se mandan los 17 campos que el legacy incluía en el XML:
 *   idrecibo, montotal, codigo, anno, cod_pred, anexo, sub_anexo, tipo,
 *   tipo_rec, periodo, imp_insol, fact_reaj, imp_reaj, fact_mora, imp_mora
 *   (mora), costo_emis, ubica.
 */
export const SimuladoDeudaReciboSchema = z.object({
  idrecibo: str,
  montotal: num,
  codigo: str,
  anno: str,
  cod_pred: str,
  anexo: str,
  sub_anexo: str,
  tipo: str,
  tipo_rec: str,
  periodo: str,
  imp_insol: num,
  fact_reaj: str.optional().default('1'),
  imp_reaj: num,
  fact_mora: str.optional().default('1'),
  imp_mora: num,
  costo_emis: num,
  ubica: str.optional().default(''),
});
export type SimuladoDeudaReciboDto = z.infer<typeof SimuladoDeudaReciboSchema>;

export const SimuladoConvenioSchema = z.object({
  deuda: z
    .array(SimuladoDeudaReciboSchema)
    .min(1, 'Debe seleccionar al menos un recibo.'),
  /** Código del contribuyente (dígitos 1-7, se hace padStart a 7). */
  codigo: z
    .string()
    .trim()
    .regex(
      /^\d{1,7}$/,
      'El código del contribuyente debe ser numérico de hasta 7 dígitos.',
    )
    .transform((v) => v.padStart(7, '0')),
  numeroCuotas: z.number().int().min(1),
  totalDeuda: num,
  totalInicial: num,
  fecGen: z.string().min(1, 'La fecha de generación es obligatoria.'),
  fecCuo: z.string().min(1, 'La fecha de primera cuota es obligatoria.'),
  /** Código del apoderado (vacío = el contribuyente es el responsable). */
  codResp: z.string().optional().default(''),
  /** El legacy pasaba '' (no tenía login); hoy llegan del usuario logueado. */
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});
export type SimuladoConvenioDto = z.infer<typeof SimuladoConvenioSchema>;

// ── 4b) generación real del convenio (Rentas.GeneraConvenio) ─────────────
/**
 * Mismo payload que el simulado + la condición y el tipo de deuda.
 * El SP graba el convenio y devuelve su número (primer valor de la
 * primera fila — legacy: `echo $rowrecibos[0][0]`).
 */
export const GenerarConvenioSchema = SimuladoConvenioSchema.extend({
  /** condicion_id devuelto por CondicionConvenio (puede venir vacío). */
  condicionId: z.string().optional().default(''),
  /** IP | ARB | VEH | MUL — texto del tipo de deuda seleccionado. */
  tipoDeuda: z.string().optional().default(''),
});
export type GenerarConvenioDto = z.infer<typeof GenerarConvenioSchema>;

// ── 4c) reporte del convenio ya generado (Rentas.ImprimeConvenio) ────────
export const ConvenioReporteSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{1,7}$/, 'El código del contribuyente debe ser numérico de hasta 7 dígitos.')
    .transform((v) => v.padStart(7, '0')),
  /** Número de convenio devuelto por GeneraConvenio (ej. 'CF-000123' / 'PIT-…'). */
  convenio: z.string().trim().min(1, 'El número de convenio es obligatorio.'),
});
export type ConvenioReporteDto = z.infer<typeof ConvenioReporteSchema>;

// ── 4d) listado de fraccionamientos (Rentas.ImprimeConvenio @buscar=4) ───
export const ListadoFraccSchema = z.object({
  /** Código del contribuyente (dígitos 1-7, se hace padStart a 7). */
  codigo: z
    .string()
    .trim()
    .regex(
      /^\d{1,7}$/,
      'El código del contribuyente debe ser numérico de hasta 7 dígitos.',
    )
    .transform((v) => v.padStart(7, '0')),
});
export type ListadoFraccDto = z.infer<typeof ListadoFraccSchema>;

// ── 4e) anular convenio (Rentas.Anularconvenio) ─────────────────────────
export const AnularConvenioSchema = z.object({
  /** Código del contribuyente (dígitos 1-7, se hace padStart a 7). */
  codigo: z
    .string()
    .trim()
    .regex(
      /^\d{1,7}$/,
      'El código del contribuyente debe ser numérico de hasta 7 dígitos.',
    )
    .transform((v) => v.padStart(7, '0')),
  /** Número de convenio a anular (ej. 'CF-000123' / 'PIT-…'). */
  convenio: z.string().trim().min(1, 'El número de convenio es obligatorio.'),
  /**
   * Operador (usuario logueado) y estación (nombre de PC). El legacy los
   * derivaba en el servidor (strtoupper del login/gethostname); hoy llegan
   * del frontend como en GenerarConvenio.
   */
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});
export type AnularConvenioDto = z.infer<typeof AnularConvenioSchema>;

// ── 4f) reporte tesorería (Rentas.ImprimeConvenio @buscar=8) ─────────────
/** Filtros del reporte de tesorería (consulta más amplia que el grid). */
export const ReporteFraccionamientosConsultaSchema = z.object({
  desde: z.string().min(1, 'La fecha desde es obligatoria.'),
  hasta: z.string().min(1, 'La fecha hasta es obligatoria.'),
  /** Usuario seleccionado en el combo ('' = todos los usuarios). */
  operador: z.string().optional().default(''),
});
export type ReporteFraccionamientosConsultaDto = z.infer<
  typeof ReporteFraccionamientosConsultaSchema
>;



// ── 5) lookup de apoderado ──────────────────────────────────────────────
export const FraccionarApoderadoSchema = z.object({
  /** Código del apoderado: solo dígitos, 1-7 chars (se le hace padStart a 7). */
  codigo: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z
        .string()
        .regex(/^\d+$/, 'El código del apoderado solo debe contener dígitos.')
        .min(1, 'El código del apoderado es obligatorio.')
        .max(7, 'El código no puede superar los 7 caracteres.'),
    ),
});
export type FraccionarApoderadoDto = z.infer<typeof FraccionarApoderadoSchema>;
