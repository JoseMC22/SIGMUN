# Arquitectura — SIGMUN

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend runtime | Node.js + NestJS 11 |
| Frontend | Next.js 16 (App Router) + React 19 |
| Lenguaje | TypeScript 5.x strict |
| Base de datos | SQL Server vía driver `mssql` v12 — sin ORM |
| Autenticación | passport-jwt con HttpOnly cookies + refresh token rotation |
| Validación | Zod (schemas compartidas frontend/backend) |
| UI Framework | Tailwind CSS v4 + shadcn/ui + lucide-react |
| Paquetería | pnpm (workspaces monorepo) |
| Testing Backend | Jest 30 + @nestjs/testing + supertest |
| Testing Frontend | Vitest 1.x + @testing-library/react + jsdom |

## Clean Architecture (obligatorio)

Separación estricta en 4 capas. Aplica tanto en backend como en frontend:

```
src/
├── domain/           # Entidades, interfaces, lógica de negocio pura (sin dependencias externas)
├── application/      # Casos de uso, servicios, hooks, mappers
├── infrastructure/   # Clientes API, repositorios, bases de datos
└── presentation/     # Componentes, layouts, páginas (solo frontend)
```

### Backend (NestJS)

Estructura por módulo dentro de `backend/src/`:

```
backend/src/seguridad/
├── perfiles/
│   ├── dto/                    # DTOs con validación (Zod)
│   ├── perfiles.controller.ts  # Endpoints (presentation layer)
│   ├── perfiles.service.ts     # Lógica de negocio (application layer)
│   ├── perfiles.controller.spec.ts
│   └── perfiles.service.spec.ts
└── seguridad.module.ts         # NestJS module
```

Reglas:
- **Controllers**: solo manejan request/response, delegan al service
- **Services**: lógica de negocio, llaman a SPs via driver mssql
- **No ORM**: toda la persistencia es vía stored procedures con consultas parametrizadas
- **No `any`**: tipado estricto. Excepción solo en tests con comentario `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

### Frontend (Next.js App Router)

```
frontend/src/
├── app/                        # Páginas (App Router)
│   └── dashboard/seguridad/perfiles/
│       ├── page.tsx            # Server Component por defecto
│       ├── perfil-edit-modal.tsx  # Client Component si necesita interactividad
│       └── perfiles.test.tsx
├── components/                 # Componentes compartidos
├── actions/                    # Server Actions
├── application/                # Hooks y servicios
├── domain/                     # Tipos e interfaces
└── infrastructure/             # Clientes API
```

Reglas:
- **Default Server Components**: toda página y obtención de datos arranca como RSC
- **`use client`** solo para: estado local, APIs del navegador, interactividad
- **shadcn/ui** para componentes de UI (wrapear en client components cuando usen hooks)
- **Estilo**: Tailwind CSS v4, sin CSS modules ni styled-components

## Base de datos

- Driver `mssql` v12 con consultas parametrizadas
- Prohibido concatenar strings en queries
- Stored procedures para toda operación
- Los SPs se nombran con prefijo (`sp_`, `usp_`, etc.) según convención existente
