import { z } from 'zod';

export const GenerarRdSchema = z.object({
  registros: z.array(z.object({
    // Campos obligatorios
    idrecibo: z.string().min(1),
    anio: z.string().min(4),
    // Datos del contribuyente para el SP generador
    codigo: z.string().min(1),
    nombre: z.string().optional().default(''),
    dirfiscal: z.string().optional().default(''),
    num_doc: z.string().optional().default(''),
    // Datos del pendiente para el @dataxml
    num_ingr: z.string().optional().default('0'),
    montotal: z.string().optional().default('0'),
    cod_pred: z.string().optional().default(''),
    anexo: z.string().optional().default(''),
    sub_anexo: z.string().optional().default(''),
    tipo_rec: z.string().optional().default(''),
    periodo: z.string().optional().default(''),
    imp_insol: z.string().optional().default('0'),
    fact_reaj: z.string().optional().default('0'),
    imp_reaj: z.string().optional().default('0'),
    fact_mora: z.string().optional().default('0'),
    imp_mora: z.string().optional().default('0'),
    costo_emis: z.string().optional().default('0'),
    observacion: z.string().optional().default(''),
    operador: z.string().optional().default(''),
    estacion: z.string().optional().default(''),
    fech_ing: z.string().optional().default(''),
    tipo: z.string().optional().default(''),
    tipo_docu: z.string().optional().default(''),
    num_docu: z.string().optional().default(''),
    fec_venc: z.string().optional().default(''),
    ubica: z.string().optional().default(''),
    des_tipo: z.string().optional().default(''),
    imp_reaj_num: z.number().optional(),
    mora_num: z.number().optional(),
    interes_num: z.number().optional(),
    total_num: z.number().optional(),
  })).min(1, 'Debe seleccionar al menos un registro'),
});

export type GenerarRdDto = z.infer<typeof GenerarRdSchema>;