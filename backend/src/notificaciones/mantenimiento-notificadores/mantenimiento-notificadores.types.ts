// ── SP result interfaces for Mantenimiento de Notificadores ──

/** A single notificador row from SP `[notificacion].[ssp_cargos_notificacion]` @busc=11. */
export interface ListarNotificadorResult {
  codigo_autoridad: number | string; // PK (int)
  iniciales: string; // = codigo_area (immutable on update)
  notificador: string; // = descripcion (nombre)
  estado: string; // 'Activado' | 'Desactivado' (from flag)
}

/** Alias used by tasks.md (NotificadorRow == ListarNotificadorResult). */
export type NotificadorRow = ListarNotificadorResult;

/** Unified envelope returned by every service/controller method. */
export interface MantenimientoResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

/** Alias used by tasks.md (NotificadorResult == MantenimientoResult). */
export type NotificadorResult = MantenimientoResult;
