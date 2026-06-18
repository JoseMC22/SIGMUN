# Testing — SIGMUN

## Stack

| Capa | Runner | Framework |
|------|--------|-----------|
| Backend | Jest 30 | @nestjs/testing + supertest |
| Frontend | Vitest 1.x | @testing-library/react + jsdom |

## Comandos

```bash
# Backend
pnpm --filter backend test          # Unit tests
pnpm --filter backend test:cov      # Cobertura
pnpm --filter backend test:e2e      # E2E

# Frontend
pnpm --filter frontend test         # Tests
```

## Convenciones

- Archivos de test al lado del archivo que prueban:
  - `perfiles.service.ts` → `perfiles.service.spec.ts`
  - `page.tsx` → `perfiles.test.tsx`
- Patrón de naming: `<nombre>.<tipo>.spec.ts` (backend) o `<nombre>.<tipo>.test.tsx` (frontend)
- Una descripción por `describe()` que identifique el módulo/clase bajo test

## Cobertura objetivo

- **Módulos críticos** (auth/, repositorios, pagos): >= 80%
- **Resto del código**: >= 60%
- La cobertura se mide con `test:cov`

## Estructura de test (backend)

```typescript
describe('PerfilesService', () => {
  describe('getPerfiles', () => {
    it('should return paginated perfiles', async () => { ... });
    it('should throw when database is unavailable', async () => { ... });
  });
});
```

## Estructura de test (frontend)

```typescript
describe('PerfilesPage', () => {
  it('should render the search input', () => { ... });
  it('should show loading state initially', () => { ... });
});
```

## Reglas

- Los tests deben pasar antes de commitear
- No commitear tests que fallen
- Mockear la capa de base de datos en tests unitarios (no llamar SPs reales)
- Usar `@nestjs/testing` para integration tests del backend
- Usar `@testing-library/react` para tests de componentes (no enzyme)
