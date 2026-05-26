# 🚀 SIGMUN Modernization

Este proyecto es una modernización del sistema SIGMUN, utilizando una arquitectura limpia y moderna.

## 🛠️ Tecnologías

- **Backend:** NestJS, SQL Server (driver `mssql`), JWT, Zod.
- **Frontend:** Next.js 16 (App Router), Tailwind CSS, React 19, Shadcn/ui..
- **Gestor de Paquetes:** `pnpm`.

## 📂 Estructura del Proyecto

- `/backend`: API REST construida con NestJS + mssql para Stored Procedures.
- `/frontend`: Aplicación web construida con Next.js, utilizando Shadcn/ui para componentes UI.

---

## 🚀 Ejecución en Desarrollo

### Backend
```bash
cd backend
pnpm install
pnpm run start:dev
```
*La API estará disponible en `http://localhost:3001/api`*

### Frontend
```bash
cd frontend
pnpm install
pnpm run dev
```
*La aplicación estará disponible en `http://localhost:3000`*

---

## 🔑 Autenticación (Login/Logout)

El sistema utiliza el Stored Procedure legacy `[Acceso].[sp_LogOut]` para la gestión de accesos:

- **Login:** `POST /api/auth/login` → `{ "username": "...", "password": "..." }`
- **Logout:** `POST /api/auth/logout` → Requiere Bearer Token.

### Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Autentica al usuario y devuelve JWT |
| POST | `/api/auth/logout` | Cierra la sesión (requiere token) |

---

## 📜 Estándares del Proyecto

Consulta los archivos de configuración para más detalles:
- `AGENT_GUIDELINES.md`: Reglas técnicas y de arquitectura.
- `design_system.md`: Identidad visual y componentes.
- `.trae/skills/sigmun-standard/SKILL`: Skill con las directrices del proyecto.
