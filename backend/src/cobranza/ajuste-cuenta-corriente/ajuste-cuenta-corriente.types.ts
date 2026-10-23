/**
 * Tipos del combo de tipos de documento de sustento del ajuste de cuenta
 * corriente.
 *
 * Fuente: Rentas.sp_cuentacorriente @msquery=11. El legacy PHP leía el
 * resultset por POSICIÓN (RegistrosCombo($rows, 0, 1): columna 0 = value,
 * columna 1 = label) y no por nombre, así que los nombres de columna del SP
 * se desconocen: el mapeo a id/nombre también es posicional (ver el service).
 */
export interface TipoDocSustentoItem {
  id: string;
  nombre: string;
}

export interface AjusteTiposDocResult {
  success: boolean;
  data: TipoDocSustentoItem[];
  error?: string;
}
