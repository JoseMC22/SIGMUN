# Contratos API — SIGMUN

## Error Envelope Canónico

Toda respuesta de error DEBE usar este formato:

```typescript
{
  code: string;       // Código máquina, sin espacios
  message: string;    // Mensaje legible
  details?: object;   // Opcional, detalles adicionales
}
```

### Códigos de error estándar

| Código | HTTP Status | Cuándo usarlo |
|--------|-------------|---------------|
| `validation_error` | 400 | Error de validación Zod |
| `auth_invalid` | 401 | Token expirado o inválido |
| `auth_forbidden` | 403 | Sin permisos para el recurso |
| `not_found` | 404 | Recurso no existe |
| `schema_mismatch` | 500 | Error interno de schema |
| `database_unavailable` | 503 | Base de datos no disponible |

### Errores de validación

```json
{
  "code": "validation_error",
  "message": "Validation failed",
  "details": {
    "errors": [
      { "path": "email", "message": "Invalid email format" }
    ]
  }
}
```

## Validación — Zod

- **Zod** para validación compartida frontend/backend
- Los schemas Zod viven en `dto/` dentro de cada módulo
- Usar `z.infer<typeof Schema>` para tipos derivados
- Mapeo Zod → Dominio mediante funciones `map<Schema>To<Entity>` en `src/application/mappers/`

## API Design

- Verbos HTTP semánticos: GET (listar/obtener), POST (crear/buscar), PATCH (actualizar), DELETE (eliminar)
- Rutas en plural: `/api/perfiles`, `/api/usuarios`
- Versión en ruta cuando aplique: `/v1/perfiles`
- Parámetros de búsqueda por query string en GET
- Búsquedas complejas por POST con body tipado

## Stored Procedures

- Toda interacción con BD es vía SPs con consultas parametrizadas
- Los SPs reciben parámetros tipados
- Nunca concatenar strings para construir queries
