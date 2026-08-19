/** Per-object permission returned by SP_MAcceso @busc='7' */
export interface ObjectPermission {
  id_objeto: string;
  bacceso: 0 | 1;
}

/** Raw row shape returned by the stored procedure */
export interface SpObjectAccessRow {
  id_objeto: string;
  bacceso: number;
}

/** API response envelope for GET /seguridad/object-access/:id_acceso */
export interface ObjectAccessResponse {
  id_acceso: number;
  objects: ObjectPermission[];
}
