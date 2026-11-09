# Proposal — Constancia de Exigibilidad (`notificaciones/constancia-exigibilidad`)

## Why

SIGMUN no tiene hoy la pantalla de emisión de la **Constancia de Exigibilidad**, un
documento legal que el sistema legacy (`FrmConstanciaExigibilidad`, SIGNotificaciones)
sí permite generar. Solo existe el `reporte-constancia-exigibilidad` (consulta), que
no emite el documento. Hace falta portar la emisión completa.

## What changes

Se agrega el modulo `notificaciones/constancia-exigibilidad`:

- **Backend** (`backend/src/notificaciones/constancia-exigibilidad/`): service con las
  4 acciones del SP `COACTIVO.USP_EXIGIBILIDAD` (`@opcion` 1/2/3/4), DTOs Zod,
  controller y module. Registro en `notificaciones.module.ts`.
- **Frontend**: server action, pagina con el form (Validar/Grabar/Imprimir/Cancelar),
  y export del PDF imprimible (sin QR) a partir de una plantilla HTML institucional.

## Capabilities

- `notificaciones-constancia-exigibilidad`

## Impact

- Afecta solo a `notificaciones` (modulo nuevo). No toca `cobranza` ni el reporte existente.
- Depende del SP `COACTIVO.USP_EXIGIBILIDAD` (esquema `COACTIVO`) y de
  `Contenedor.TblTipo_valor` (combo TipoValor).
- Genera PDF A4 (libreria de HTML→PDF del frontend) sin codigo QR.
