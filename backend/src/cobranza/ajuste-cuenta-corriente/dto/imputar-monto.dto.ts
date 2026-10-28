import { z } from 'zod';

/**
 * Recibo seleccionado de la grilla del Estado de Cuenta tal como lo armaba
 * el legacy PHP para @dataxml de sp_Compensarrecibosjson: EXACTAMENTE estas
 * 22 claves (números sin separadores de miles). Se acepta string|number
 * porque la grilla nueva viaja numérica pero el SP legacy nació leyendo el
 * XML del grid viejo; el conjunto es exacto (sin claves extra).
 */
const ReciboCompensarSchema = z.object({
  idrecibo: z.union([z.string(), z.number()]),
  codigo: z.union([z.string(), z.number()]),
  anno: z.union([z.string(), z.number()]),
  cod_pred: z.union([z.string(), z.number()]),
  anexo: z.union([z.string(), z.number()]),
  sub_anexo: z.union([z.string(), z.number()]),
  tipo: z.union([z.string(), z.number()]),
  tipo_rec: z.union([z.string(), z.number()]),
  periodo: z.union([z.string(), z.number()]),
  imp_insol: z.union([z.string(), z.number()]),
  fact_reaj: z.union([z.string(), z.number()]),
  imp_reaj: z.union([z.string(), z.number()]),
  fact_mora: z.union([z.string(), z.number()]),
  imp_mora: z.union([z.string(), z.number()]),
  costo_emis: z.union([z.string(), z.number()]),
  estado: z.union([z.string(), z.number()]),
  ubica: z.union([z.string(), z.number()]),
  fec_venc: z.union([z.string(), z.number()]),
  fec_pago: z.union([z.string(), z.number()]),
  num_ingr: z.union([z.string(), z.number()]),
  fech_ing: z.union([z.string(), z.number()]),
  montotal: z.union([z.string(), z.number()]),
});

/**
 * Esquema de la imputación de monto del ajuste de cuenta corriente
 * (Rentas.sp_Compensarrecibosjson).
 *
 * Legacy PHP (botón "Imputar Monto"): @dataxml = JSON de las filas
 * seleccionadas, @montoacuenta = "Total a Ajustar", @monto = total de las
 * filas seleccionadas, más el documento de sustento, @tipo_baja=0,
 * @operador = usuario logueado y @estacion = primer octeto de la IP del
 * cliente (la estación la deriva el controller, no viaja en el body).
 */
export const ImputarMontoSchema = z.object({
  codigo: z.string().min(1),
  nroDocSustento: z.string().min(1),
  docSustento: z.string().min(1),
  tipoDocSustento: z.string().min(1),
  montoAjustar: z.number().positive(),
  montoTotal: z.number().nonnegative(),
  operador: z.string().min(1),
  recibos: z.array(ReciboCompensarSchema).min(1),
});

export type ReciboCompensarItem = z.infer<typeof ReciboCompensarSchema>;
export type ImputarMontoDto = z.infer<typeof ImputarMontoSchema>;
