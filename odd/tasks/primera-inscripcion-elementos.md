# Feature: Elementos de vista 1ra. Inscripción (réplica fiel del bloque principal legado)

Réplica de predios.phtml (abierto con tipo=N&nestado=1) en primera-inscripcion-modal.tsx.
Alcance decidido por el usuario: los 4 grupos (valores del predio, resumen arbitrios,
cabecera y pie legado, botones Rusticos/Inquilinos). Baja de predio (nestado=0) queda
para otra sesión (pi agent). Vista de los tabs se refinara después.

## Scope
- Frontend: frontend/src/app/dashboard/administracion-tributaria/declaracion-jurada/primera-inscripcion-modal.tsx.
- Solo-display: el backend (ingre_predio) no consume los campos resumen (arancel: 0 fijo);
  sin cambios en payload/DTO.
- Rusticos/Inquilinos: popups rentas/rustico y rentas/inquilino no migrados; los botones
  replican el aviso del legado ("Debe registrar el predio antes...") y avisan "no migrado"
  si ya hay codPred.
- NO backend. NO commit (decisión del usuario; branch DEV con trabajo previo sin commit).
- Verificación: npx tsc --noEmit en frontend.

## Tasks
1. [x] Cabecera: Cod.Predio / Anexo-SubAnexo + Valores del predio (V.Terreno, V.Construcción, V.Instalaciones, Autovalúo)
2. [x] Resumen arbitrios: Barrido, Recolección, Parques, Serenazgo, Area Const (Σ del grid de pisos)
3. [x] Pie: Usuario, Estación, Última Modificación + botones Rusticos/Inquilinos con aviso
4. [x] tsc limpio en frontend

Estado: completado (sin commit, decisión del usuario). Pendiente: popups rentas/rustico e
inquilino no migrados (los botones avisan); refinamiento de tabs cuando se pasen las vistas;
nestado=0 (baja) en otra sesión (pi agent).
