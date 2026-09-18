import { z } from 'zod';

// ── Crear Solicitud ───────────────────────────────────────────────────────────

export const OficinaDestinoItemSchema = z.object({
  cCodAreaDestino: z.string().min(1, 'El código de área de destino es requerido'),
  cDetalleSolicitud: z.string().optional(),
});

export const CrearSolicitudSchema = z.object({
  iCodTramite: z.coerce.number().positive('ID de trámite requerido'),
  cCodificacion: z.string().min(1, 'La codificación del trámite es requerida'),
  ccodigo: z.string().optional(),
  cObservacionLegal: z.string().optional(),
  fFecDesde: z.string().optional(),
  fFecHasta: z.string().optional(),
  iCodTrabajadorSolicita: z.string().optional(),
  cCodAreaSolicita: z.string().optional(),
  oficinasDestino: z.array(OficinaDestinoItemSchema).min(1, 'Debe seleccionar al menos una oficina'),
});

export type CrearSolicitudDto = z.infer<typeof CrearSolicitudSchema>;

// ── Consultar Tramites Bomberos ──────────────────────────────────────────────

export const ConsultarTramitesBomberosSchema = z.object({
  fFecDesde: z.string().optional(),
  fFecHasta: z.string().optional(),
  ccodigo: z.string().optional(),
  cCodificacion: z.string().optional(),
});

export type ConsultarTramitesBomberosDto = z.infer<typeof ConsultarTramitesBomberosSchema>;

// ── Consultar Estado ─────────────────────────────────────────────────────────

export const ConsultarEstadoSchema = z.object({
  iCodTramite: z.coerce.number().optional(),
  cCodificacion: z.string().optional(),
  iCodOficina: z.coerce.number().optional(),
});

export type ConsultarEstadoDto = z.infer<typeof ConsultarEstadoSchema>;
