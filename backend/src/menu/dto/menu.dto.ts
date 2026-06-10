export interface SpMenuModuleResult {
  id_acceso: string;
  nombre: string;
}

export interface SpMenuSubmoduleResult {
  id_acceso: string;
  nombre: string;
  doform: string;
  doform2: string;
  icono: string;
  formulario: string;
}

export interface MenuModuleResponse {
  id: string;
  title: string;
}

export interface MenuSubmenuResponse {
  id: string;
  title: string;
  path: string;
  icon: string;
  form: string;
}
