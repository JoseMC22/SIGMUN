# Design: Modal Generar Cartas

## Architecture Overview

Self-contained modal component that fetches its own data via server actions. Follows the existing backend pattern (controller + service + DTO + types) and frontend pattern (server actions with `authFetch`).

```
┌─────────────────────────────────────────────────┐
│  page.tsx (parent)                              │
│  state: modalOpen, selectedCodigo               │
│  handleGenerar → set modalOpen + selectedCodigo │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  modal-generar.tsx                        │  │
│  │  Props: { open, onClose, codigo }         │  │
│  │                                           │  │
│  │  State: contribuyente, cartas, page, ...  │  │
│  │  On mount/open → fetch both via actions   │  │
│  │                                           │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │ Header: title + close (×)           │  │  │
│  │  ├─────────────────────────────────────┤  │  │
│  │  │ GroupField: contributor (readonly)  │  │  │
│  │  │   Código: {codigo}                  │  │  │
│  │  │   Nombre: {nombres} {paterno} {mat} │  │  │
│  │  ├─────────────────────────────────────┤  │  │
│  │  │ Table: cartas de requerimiento      │  │  │
│  │  │   idCarta | nroCarta | año | ...    │  │  │
│  │  │   [Editar] per row (stub)           │  │  │
│  │  ├─────────────────────────────────────┤  │  │
│  │  │ Pagination: 10/page                 │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Backend Changes

### New Types (`cartas-requerimiento.types.ts`)

```typescript
// SP result for mquery=12
export interface SpContribuyenteRow {
  codigo: string;
  nombres: string;
  paterno: string;
  materno: string;
}

// Domain type
export interface ContribuyenteInfo {
  codigo: string;
  nombreCompleto: string;
}

// SP result for mquery=4
export interface SpCartaRequerimientoRow {
  idCarta: number;
  nroCarta: string;
  anio: string;
  dia: string;
  mes: string;
  ye: string;
  detalle: string;
  ROW: number;
}

// Domain type
export interface CartaRequerimientoItem {
  idCarta: number;
  nroCarta: string;
  anio: string;
  dia: string;
  mes: string;
  year: string;
  detalle: string;
  row: number;
}
```

### New DTOs (`dto/search-cartas-requerimiento.dto.ts`)

```typescript
export const GetContribuyenteSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
});

export const SearchCartasSchema = z.object({
  codigo: z.string().min(1, 'Código es requerido'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
```

### New Service Methods (`cartas-requerimiento.service.ts`)

```typescript
async getContribuyente(codigo: string): Promise<ContribuyenteInfo | null> {
  const result = await this.db.executeProcedure<any>(
    this.SP_NAME,
    { mquery: '12', codigo },
  );
  const row = result.recordset?.[0];
  if (!row) return null;
  return {
    codigo: row.codigo ?? '',
    nombreCompleto: [row.nombres, row.paterno, row.materno]
      .filter(Boolean).join(' '),
  };
}

async searchCartas(
  codigo: string, page: number, pageSize: number,
): Promise<PaginatedResponse<CartaRequerimientoItem>> {
  const { inicio, final } = calculatePaginationParams(page, pageSize);

  // Total count (@mquery='5')
  const totalResult = await this.db.executeProcedure<any>(
    this.SP_NAME,
    { mquery: '5', codContrib: codigo },
  );
  const total = totalResult.recordset?.[0]
    ? Number(Object.values(totalResult.recordset[0])[0]) : 0;

  // Paginated data (@mquery='4')
  const rowsResult = await this.db.executeProcedure<any>(
    this.SP_NAME,
    { mquery: '4', codContrib: codigo, inicio, final },
  );

  const data = (rowsResult.recordset || []).map((row: any) => ({
    idCarta: row.idCarta ?? 0,
    nroCarta: row.nroCarta ?? '',
    anio: row.anio ?? '',
    dia: row.dia ?? '',
    mes: row.mes ?? '',
    year: row.ye ?? '',
    detalle: row.detalle ?? '',
    row: row.ROW ?? 0,
  }));

  return {
    data, total, page, pageSize,
    totalPages: total > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
```

### New Controller Endpoints (`cartas-requerimiento.controller.ts`)

```typescript
@Post('contribuyente')
async getContribuyente(@Body() dto: GetContribuyenteDto) {
  const parsed = GetContribuyenteSchema.parse(dto);
  return this.service.getContribuyente(parsed.codigo);
}

@Post('cartas')
async searchCartas(@Body() dto: SearchCartasDto) {
  const parsed = SearchCartasSchema.parse(dto);
  return this.service.searchCartas(parsed.codigo, parsed.page, parsed.pageSize);
}
```

## Frontend Changes

### New Server Actions (`cartas-requerimiento.ts`)

```typescript
export async function getContribuyenteAction(codigo: string) {
  try {
    const response = await authFetch(
      '/fiscalizacion-tributaria/cartas-requerimiento/contribuyente',
      { method: 'POST', body: JSON.stringify({ codigo }) },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}

export async function searchCartasAction(codigo: string, page: number, pageSize: number) {
  try {
    const response = await authFetch(
      '/fiscalizacion-tributaria/cartas-requerimiento/cartas',
      { method: 'POST', body: JSON.stringify({ codigo, page, pageSize }) },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false as const, error: errorData.message ?? `Error ${response.status}` };
    }
    const result = await response.json();
    return { success: true as const, ...result };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : 'Error de conexión' };
  }
}
```

### Modal Component (`modal-generar.tsx`)

**Props**: `{ open: boolean; onClose: () => void; codigo: string }`

**State management**:
```typescript
const [contribuyente, setContribuyente] = useState<ContribuyenteInfo | null>(null);
const [cartas, setCartas] = useState<CartaRequerimientoItem[]>([]);
const [total, setTotal] = useState(0);
const [page, setPage] = useState(1);
const [totalPages, setTotalPages] = useState(0);
const [loadingContribuyente, setLoadingContribuyente] = useState(false);
const [loadingCartas, setLoadingCartas] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**Data fetching**: Two independent `useEffect` hooks triggered by `open` and `codigo`:
1. Contributor fetch: `getContribuyenteAction(codigo)` → sets `contribuyente`
2. Cartas fetch: `searchCartasAction(codigo, page, 10)` → sets `cartas`, `total`, `totalPages`

**Pagination**: `useEffect` on `page` change triggers cartas re-fetch only (contributor stays loaded).

**Render structure**:
1. Overlay: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
2. Container: `fixed inset-0 z-50 flex items-center justify-center p-4`
3. Modal panel: `bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col`
4. Header: title + close button
5. Body: scrollable area with contributor GroupField + cartas table
6. Footer: pagination bar

### Page Integration (`page.tsx`)

Minimal changes to parent:
```typescript
const [modalOpen, setModalOpen] = useState(false);
const [selectedCodigo, setSelectedCodigo] = useState('');

const handleGenerar = (codigo: string) => {
  setSelectedCodigo(codigo);
  setModalOpen(true);
};

// In render:
<ModalGenerar
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  codigo={selectedCodigo}
/>
```

## Styling Decisions

- Modal matches existing page: `slate` palette, `rounded-lg`/`rounded-xl`, `border-slate-200`
- Contributor fields: read-only styled with `bg-slate-50 border-slate-200`
- Cartas table: same pattern as main page table (gradient header, alternating rows)
- Loading: skeleton pulsing animation, same as `TableSkeleton`
- Empty state: `UserX` icon with message, same pattern as main page
- Close button: `×` with hover state, keyboard accessible

## Data Flow

```
User clicks "Generar" (page.tsx)
  → setSelectedCodigo(codigo), setModalOpen(true)
  → Modal renders with codigo prop
  → useEffect[open, codigo] fires:
    → getContribuyenteAction(codigo) → backend → SP mquery=12
    → searchCartasAction(codigo, 1, 10) → backend → SP mquery=5 (total) + mquery=4 (data)
  → State updates → contributor info + cartas table render
  → User clicks page → setPage(newPage)
  → useEffect[page] fires:
    → searchCartasAction(codigo, newPage, 10) → re-fetch cartas only
  → User clicks close → onClose() → setModalOpen(false) → modal unmounts
```
