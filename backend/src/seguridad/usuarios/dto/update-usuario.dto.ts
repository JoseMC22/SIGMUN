// ── Update Usuario DTO ──

export interface UpdateUsuarioDto {
  busc?: string; // "2" for update (default)
  id_usuario: string;
  area: string;
  nombres: string;
  apellidos: string;
  id_doc: string; // tipo documento
  num_doc: string; // número documento
  vlogin: string;
  password?: string; // existing hash or empty
  confir?: string; // confirm password
  cargo: string;
  cajero: string; // "1" if cajero enabled, else "0"
  caja: string; // cajero code when enabled
  id_perfil: string;
  nestado: string; // "0" | "1"
}

// ── Cambiar Clave DTO ──

export interface CambiarClaveDto {
  id_usuario: string;
  password: string;
  confir: string;
}
