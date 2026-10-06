import { z } from 'zod';

// ── Guardar Predio (legacy Rentas/gpredios → gprediosAction) ──
//
// Orquesta el alta / inscripción / edición de un predio:
//   1) Rentas.Stp_correlativo   @id='06'  → @dj_predial
//   2) Rentas.DatosIniciales_pu @msquery=1 → cod_pred/anexo/sub_anexo finales
//   3) [Rentas].[ingreso_piso]      × fila de la grilla Const
//   4) Rentas.sp_MInstalacion       × fila de la grilla Instal
//   5) [Rentas].[sp_Docu]           × fila de la grilla Doc
//   6) Rentas.ingre_predio          datos principales del predio
//   7) Rentas.ingre_predio_calculanios  recálculo final
//
// Los nombres de campos replican los ids del formulario legado (frmpredios)
// para mantener el mapeo 1:1 con gprediosAction.

// ── Fila de la grilla Construcciones (xgridFicIndConst) ──
export const PredioPisoSchema = z.object({
  idpisos: z.string().optional().default(''),
  cidindi: z.string().optional().default(''),
  nropiso: z.string().optional().default(''),
  mescons: z.string().optional().default(''),
  aniocons: z.string().optional().default(''),
  iddepcl: z.string().optional().default(''),
  iddepma: z.string().optional().default(''),
  iddepco: z.string().optional().default(''),
  esmuros: z.string().optional().default(''),
  estecho: z.string().optional().default(''),
  acapiso: z.string().optional().default(''),
  acapuer: z.string().optional().default(''),
  acareve: z.string().optional().default(''),
  acabanio: z.string().optional().default(''),
  instele: z.string().optional().default(''),
  arconde: z.string().optional().default('0'),
  uconant: z.string().optional().default('0'),
  umedida: z.string().optional().default(''),
  referencia: z.string().optional().default(''),
});

// ── Fila de la grilla Instalaciones (xgridFicIndInstal) ──
export const PredioInstalSchema = z.object({
  idinsta: z.string().optional().default(''),
  cidindi: z.string().optional().default(''),
  cidinst: z.string().optional().default(''),
  mescons: z.string().optional().default(''),
  aniocons: z.string().optional().default(''),
  iddepcl: z.string().optional().default(''),
  iddepma: z.string().optional().default(''),
  iddepco: z.string().optional().default(''),
  dmlargo: z.string().optional().default('0'),
  dmancho: z.string().optional().default('0'),
  dmaltos: z.string().optional().default('0'),
  protota: z.string().optional().default('0'),
  vunimed: z.string().optional().default(''),
  vdescri: z.string().optional().default('0'),
  referenciainst: z.string().optional().default(''),
});

// ── Fila de la grilla Documentos (xgridFicIndDoc) ──
export const PredioDocSchema = z.object({
  iddoc: z.string().optional().default(''),
  idreg: z.string().optional().default('0'),
  docnombre: z.string().optional().default(''),
  docdetalle: z.string().optional().default(''),
});

export const GuardarPredioSchema = z.object({
  // ── Contexto / movimiento ──
  tipo_mov: z.string().optional().default('N'),
  codigo: z.string().optional().default(''),
  anno: z.string().optional().default(''),
  // Claves actuales del predio (hidden inputs del legado; vacías en alta 'N').
  hd_codigo: z.string().optional().default(''),
  hd_idanexo: z.string().optional().default(''),
  hd_anexo: z.string().optional().default(''),
  hd_subanexo: z.string().optional().default(''),
  hd_codigo2: z.string().optional().default(''),
  hd_idanexo2: z.string().optional().default(''),
  hd_anexo2: z.string().optional().default(''),
  hd_subanexo2: z.string().optional().default(''),

  // ── Ubicación (tab 1) ──
  cbtipopredio: z.string().optional().default('1'), // 1 = Predio Urbano, 2 = Predio Rústico
  txtCp: z.string().optional().default(''),
  txtVia: z.string().optional().default(''),
  txtCvia: z.string().optional().default(''),
  txtDir: z.string().optional().default(''),
  txtNro: z.string().optional().default(''),
  txtDpto: z.string().optional().default(''),
  txtMza: z.string().optional().default(''),
  txtLte: z.string().optional().default(''),
  txtSubLte: z.string().optional().default(''),
  txtFrontis: z.string().optional().default('0'),
  txtNro2: z.string().optional().default(''),
  txtLetra: z.string().optional().default(''),
  txtLetra2: z.string().optional().default(''),
  txtFondo: z.string().optional().default('0'),
  txtUbiPar: z.string().optional().default(''),

  // ── Características (tab 2) ──
  cmbUso: z.string().optional().default(''),
  cmbTipPredio: z.string().optional().default(''),
  cmbEstadoConst: z.string().optional().default(''),
  cmbCondicion: z.string().optional().default(''),
  cmbCondicionpredio: z.string().optional().default(''),
  cmbInterior: z.string().optional().default(''),
  cmbSituacionPredio: z.string().optional().default(''),
  txtNroPiso: z.string().optional().default(''),
  txtNroCond: z.string().optional().default('0'),
  txtAreaTerreno: z.string().optional().default('0'),
  txtAreaComun: z.string().optional().default('0'),
  txtPorcenPropiedad: z.string().optional().default('100'),
  txtPorcenConstruccion: z.string().optional().default('100'),
  txtAreaUso: z.string().optional().default('0'),
  txtFecAdqui: z.string().optional().default(''),
  txtFecTrans: z.string().optional().default(''),
  txtLuz: z.string().optional().default(''),
  txtAgua: z.string().optional().default(''),
  txtObs: z.string().optional().default(''),
  txtObservacionPredio: z.string().optional().default(''),
  chAfectoPred: z.string().optional().default(''),
  chbVendido: z.string().optional().default(''),
  chbLicencia: z.string().optional().default(''),
  chbConformidad: z.string().optional().default(''),
  chbDeclaracionFab: z.string().optional().default(''),

  // ── Condición especial / situación / fiscalización ──
  txtDocEspecial: z.string().optional().default(''),
  txtNroDocEspecial: z.string().optional().default(''),
  txtFechDocEspecial: z.string().optional().default(''),
  txtFechDocEspecialInicial: z.string().optional().default(''),
  txtFechDocEspecialFinal: z.string().optional().default(''),
  txtSituacionDocumento: z.string().optional().default(''),
  txtSituacionNroDoc: z.string().optional().default(''),
  txtSituacionFechDoc: z.string().optional().default(''),
  txtFechaFisca: z.string().optional().default(''),
  txtNroFisca: z.string().optional().default(''),

  // ── Edificio / ingreso / agrupamiento ──
  cmbTipoEdificio: z.string().optional().default(''),
  txtNomEdificio: z.string().optional().default(''),
  txtPiso: z.string().optional().default(''),
  txtNumeroInterno: z.string().optional().default(''),
  txtLetraInterno: z.string().optional().default(''),
  cmbTipoIngreso: z.string().optional().default(''),
  txtNomIngreso: z.string().optional().default(''),
  cmbTipoAgrupamiento: z.string().optional().default(''),
  txtNomAgrupamiento: z.string().optional().default(''),

  // ── Arbitrios (tab 5) ──
  txtArbAfecto: z.string().optional().default(''),
  cbAfectMesDesde: z.string().optional().default(''),
  cbAfectAnnoDesde: z.string().optional().default(''),
  cbAfectMesHasta: z.string().optional().default(''),
  cbAfectAnnoHasta: z.string().optional().default(''),
  txtArbObs: z.string().optional().default(''),
  cb_limpieza: z.string().optional().default(''),
  cb_barrido: z.string().optional().default(''),
  cb_parque: z.string().optional().default(''),
  cb_serenazgo: z.string().optional().default(''),

  // ── Adquisición / motivos ──
  cmbTipoAdqui: z.string().optional().default(''),
  cmbMotivoReg: z.string().optional().default(''),
  cmbMotivoDec: z.string().optional().default(''),
  cb_notaria: z.string().optional().default(''),
  cb_motivodescargo: z.string().optional().default(''),
  txtObservacionDescargo: z.string().optional().default(''),

  // ── Recálculo ──
  chCalPredial: z.string().optional().default(''),
  chCalArbitrio: z.string().optional().default(''),

  // ── Grillas ──
  Const: z.array(PredioPisoSchema).optional().default([]),
  Instal: z.array(PredioInstalSchema).optional().default([]),
  Doc: z.array(PredioDocSchema).optional().default([]),
  oldInsItems: z.string().optional().default(''),
  oldDocItems: z.string().optional().default(''),

  // ── Auditoría ──
  operador: z.string().optional().default(''),
  estacion: z.string().optional().default(''),
});

export type GuardarPredioDto = z.infer<typeof GuardarPredioSchema>;
export type PredioPisoDto = z.infer<typeof PredioPisoSchema>;
export type PredioInstalDto = z.infer<typeof PredioInstalSchema>;
export type PredioDocDto = z.infer<typeof PredioDocSchema>;
