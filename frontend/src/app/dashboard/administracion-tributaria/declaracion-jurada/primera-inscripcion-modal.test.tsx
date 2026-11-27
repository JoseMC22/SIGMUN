import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PrimeraInscripcionModal from "./primera-inscripcion-modal";
import type { PredioCombosData } from "@/actions/administracion-tributaria/declaracion-jurada";

// Mock server actions so the component's effects resolve without network.
vi.mock("@/actions/administracion-tributaria/declaracion-jurada", () => ({
  getCombosPredioAction: vi.fn(),
  searchViasAction: vi.fn(),
  guardarPredioAction: vi.fn(),
  getPredioPisosAction: vi.fn(),
  getPredioInstalacionesAction: vi.fn(),
  getPredioDocumentosAction: vi.fn(),
  getValorPisoAction: vi.fn(),
}));

vi.mock("@/actions/auth/auth", () => ({
  checkSessionAction: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  getStoredUser: vi.fn(),
}));

import {
  getCombosPredioAction,
  searchViasAction,
  guardarPredioAction,
  getPredioPisosAction,
  getPredioInstalacionesAction,
  getPredioDocumentosAction,
  getValorPisoAction,
} from "@/actions/administracion-tributaria/declaracion-jurada";
import { checkSessionAction } from "@/actions/auth/auth";
import { getStoredUser } from "@/lib/api";

const mockedGetCombos = vi.mocked(getCombosPredioAction);
const mockedSearchVias = vi.mocked(searchViasAction);
const mockedGuardarPredio = vi.mocked(guardarPredioAction);
const mockedGetPredioPisos = vi.mocked(getPredioPisosAction);
const mockedGetPredioInstalaciones = vi.mocked(getPredioInstalacionesAction);
const mockedGetPredioDocumentos = vi.mocked(getPredioDocumentosAction);
const mockedGetValorPiso = vi.mocked(getValorPisoAction);
const mockedCheckSession = vi.mocked(checkSessionAction);
const mockedGetStoredUser = vi.mocked(getStoredUser);

const mockCombos: PredioCombosData = {
  cmbUso: [],
  cmbTipPredio: [],
  cmbEstadoConst: [],
  cmbCondicion: [],
  cmbCondicionpredio: [],
  cmbInterior: [],
  cmbSituacionPredio: [],
  cmbTipoEdificio: [],
  cmbTipoIngreso: [],
  cmbTipoAgrupamiento: [],
  cmbTipoAdqui: [],
  cmbMotivoReg: [],
  cmbMotivoDec: [],
  cb_notaria: [],
  cb_motivodescargo: [],
  cb_limpieza: [],
  cb_barrido: [],
  cb_parque: [],
  cb_serenazgo: [],
  cb_tiponivel: [],
  cb_material: [],
  cb_estado: [],
  cb_clasifica: [],
  cb_unidad_medida: [],
  detalle_inst: [],
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  codigoContribuyente: "0279126",
  razonSocial: "GARCIA LOPEZ MARIA",
  annoSeleccionado: "2026",
};

describe("PrimeraInscripcionModal - ESC closes only the topmost modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStoredUser.mockReturnValue({ username: "OPERADOR1" } as any);
    mockedCheckSession.mockResolvedValue({ authenticated: true, user: null, hostname: "PC-01" });
    mockedGetCombos.mockResolvedValue({ success: true, data: mockCombos });
    mockedSearchVias.mockResolvedValue({ success: true, data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
    mockedGuardarPredio.mockResolvedValue({ success: true, data: {} as any });
    mockedGetPredioPisos.mockResolvedValue({ success: true, data: [] });
    mockedGetPredioInstalaciones.mockResolvedValue({ success: true, data: [] });
    mockedGetPredioDocumentos.mockResolvedValue({ success: true, data: [] });
    mockedGetValorPiso.mockResolvedValue({ success: true, data: null } as any);
  });

  it("does not render when isOpen is false", () => {
    render(<PrimeraInscripcionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/1ra\. Inscripción/)).not.toBeInTheDocument();
  });

  it("closes ONLY the topmost child modal on the first ESC, then the parent on the second ESC", async () => {
    const onClose = vi.fn();
    render(<PrimeraInscripcionModal {...defaultProps} onClose={onClose} />);

    // Combos load → the Vía "Buscar" button appears.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Buscar/ })).toBeInTheDocument();
    });

    // Open the child ViaBusquedaModal (it pushes itself on top of the stack).
    fireEvent.click(screen.getByRole("button", { name: /Buscar/ }));

    await waitFor(() => {
      expect(screen.getByText("Búsqueda de Vías")).toBeInTheDocument();
    });
    // Parent modal is still open behind the child.
    expect(screen.getByText(/1ra\. Inscripción/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // First ESC must close ONLY the child (topmost). The parent must stay open.
    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Búsqueda de Vías")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/1ra\. Inscripción/)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    // Second ESC closes the parent.
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
