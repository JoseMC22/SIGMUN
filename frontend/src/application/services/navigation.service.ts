import { MenuModule } from "@/domain/models/menu";

/**
 * Mock de datos de navegación basado en la estructura legacy del SAT ICA
 * pero adaptado para una visualización moderna.
 */
export const MOCK_NAVIGATION: MenuModule[] = [
  {
    id: "admin-trib",
    title: "Administración Tributaria",
    icon: "ShieldCheck",
    submenus: [
      { id: "at-1", title: "Declaración Jurada", path: "/dashboard/dj" },
      { id: "at-2", title: "Consulta de Predios", path: "/dashboard/predios" },
      { id: "at-3", title: "Mantenimiento de Vías", path: "/dashboard/vias" },
      { id: "at-4", title: "Estado de Cuenta Proyectado", path: "/dashboard/estado-cuenta" },
    ],
  },
  {
    id: "tesoreria",
    title: "Tesorería Municipal",
    icon: "Wallet",
    submenus: [
      { id: "tm-1", title: "Caja Diario", path: "/dashboard/caja" },
      { id: "tm-2", title: "Reporte de Ingresos", path: "/dashboard/ingresos" },
    ],
  },
  {
    id: "fiscalizacion",
    title: "Fiscalización Tributaria",
    icon: "Search",
    submenus: [
      { id: "ft-1", title: "Ordenes de Fiscalización", path: "/dashboard/fiscalizacion" },
    ],
  },
  {
    id: "cobranza",
    title: "Cobranza de Deuda",
    icon: "HandCoins",
    submenus: [
      { id: "cd-1", title: "Gestión de Coactivo", path: "/dashboard/coactivo" },
    ],
  },
  {
    id: "seguridad",
    title: "Seguridad",
    icon: "Lock",
    submenus: [
      { id: "s-1", title: "Usuarios del Sistema", path: "seguridad/usuarios" },
      { id: "s-3", title: "Perfiles", path: "seguridad/perfiles" },
      { id: "s-2", title: "Auditoría", path: "/dashboard/auditoria" },
    ],
  },
];
