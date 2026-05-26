/**
 * Entidad de dominio que representa un submenú dentro del sistema SIGMUN.
 */
export interface Submenu {
  id: string;
  title: string;
  path: string;
  icon?: string;
}

/**
 * Entidad de dominio que representa un módulo o menú principal.
 */
export interface MenuModule {
  id: string;
  title: string;
  icon: string;
  submenus: Submenu[];
}

/**
 * Representa la estructura de navegación completa del usuario.
 */
export interface UserNavigation {
  modules: MenuModule[];
}
