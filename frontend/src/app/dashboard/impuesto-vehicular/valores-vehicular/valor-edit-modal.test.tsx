import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server actions module before any imports
vi.mock("@/actions/valores", () => ({
  fetchValorDetailAction: vi.fn(),
  fetchCategoriasAction: vi.fn(),
  fetchMarcasAction: vi.fn(),
  fetchModelosFiltradosAction: vi.fn(),
  fetchAniosEjercicioAction: vi.fn(),
  fetchAniosAction: vi.fn(),
  saveValorAction: vi.fn(),
}));

import ValorEditModal from "./valor-edit-modal";
import {
  fetchValorDetailAction,
  fetchCategoriasAction,
  fetchMarcasAction,
  fetchModelosFiltradosAction,
  fetchAniosEjercicioAction,
  fetchAniosAction,
  saveValorAction,
} from "@/actions/valores";

const mockedDetail = vi.mocked(fetchValorDetailAction);
const mockedCategorias = vi.mocked(fetchCategoriasAction);
const mockedMarcas = vi.mocked(fetchMarcasAction);
const mockedModelosFiltrados = vi.mocked(fetchModelosFiltradosAction);
const mockedAniosEjercicio = vi.mocked(fetchAniosEjercicioAction);
const mockedAnios = vi.mocked(fetchAniosAction);
const mockedSave = vi.mocked(saveValorAction);

// ── Mock data ────────────────────────────────────────────

const mockCategorias = [
  { id: "1", nombre: "SEDAN" },
  { id: "2", nombre: "SUV" },
];

const mockMarcas = [
  { id: "10", nombre: "TOYOTA" },
  { id: "20", nombre: "NISSAN" },
];

const mockAnios = [
  { id: "2023", nombre: "2023" },
  { id: "2024", nombre: "2024" },
];

const mockAniosEjercicio = [
  { id: "2025", nombre: "2025" },
  { id: "2026", nombre: "2026" },
];

const mockModelos = [
  { id: "100", nombre: "COROLLA", codmodelo: "M001" },
  { id: "200", nombre: "YARIS", codmodelo: "M002" },
];

const mockDetail = {
  id: "42",
  id_anio: "2025",
  id_categoria: "1",
  id_marca: "10",
  id_modelo: "M001",
  xidmod: "100",
  anio: "2023",
  monto: 50000,
  estado: "ACTIVO",
};

// ── Default catalog responses ────────────────────────────

const defaultCatalogResponses = () => {
  mockedCategorias.mockResolvedValue({ success: true as const, data: mockCategorias });
  mockedMarcas.mockResolvedValue({ success: true as const, data: mockMarcas });
  mockedAnios.mockResolvedValue({ success: true as const, data: mockAnios });
  mockedAniosEjercicio.mockResolvedValue({ success: true as const, data: mockAniosEjercicio });
};

// ── Helpers ──────────────────────────────────────────────

function renderModal(isOpen: boolean, valorId: string | null = null) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const result = render(
    <ValorEditModal
      isOpen={isOpen}
      valorId={valorId}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  return { onClose, onSaved, ...result };
}

// ── Tests ────────────────────────────────────────────────

describe("ValorEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultCatalogResponses();
  });

  describe("Modal visibility", () => {
    it("renders nothing when closed", () => {
      const { container } = renderModal(false);
      expect(container.innerHTML).toBe("");
    });

    it("opens with 'Nuevo Valor' title for new records", async () => {
      renderModal(true);
      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });
    });

    it("opens with 'Editar Valor' title when editing", async () => {
      mockedDetail.mockResolvedValue({ success: true as const, data: mockDetail });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true, "42");
      await waitFor(() => {
        expect(screen.getByText("Editar Valor")).toBeInTheDocument();
      });
    });
  });

  describe("Catalogs load on mount", () => {
    it("fetches all 4 catalogs when modal mounts", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(mockedCategorias).toHaveBeenCalledTimes(1);
        expect(mockedMarcas).toHaveBeenCalledTimes(1);
        expect(mockedAnios).toHaveBeenCalledTimes(1);
        expect(mockedAniosEjercicio).toHaveBeenCalledTimes(1);
      });
    });

    it("renders categorias in the Categoría select", async () => {
      renderModal(true);

      await waitFor(() => {
        const select = screen.getByLabelText(/categoría/i);
        expect(select).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
        expect(screen.getByText("SUV")).toBeInTheDocument();
      });
    });

    it("renders marcas in the Marca select", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("TOYOTA")).toBeInTheDocument();
        expect(screen.getByText("NISSAN")).toBeInTheDocument();
      });
    });

    it("renders años ejercicio in the Año Ejercicio select", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("2025")).toBeInTheDocument();
        expect(screen.getByText("2026")).toBeInTheDocument();
      });
    });

    it("renders años in the Año select", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("2023")).toBeInTheDocument();
        expect(screen.getByText("2024")).toBeInTheDocument();
      });
    });
  });

  describe("Cascading modelos logic", () => {
    it("does NOT fetch modelos on mount when no categoria/marca selected", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(mockedModelosFiltrados).not.toHaveBeenCalled();
      });
    });

    it("fetches modelos when both categoria and marca are selected", async () => {
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      // Select categoria
      const categoriaSelect = screen.getByLabelText(/categoría/i);
      fireEvent.change(categoriaSelect, { target: { value: "1" } });

      // Select marca
      const marcaSelect = screen.getByLabelText(/^marca /i);
      fireEvent.change(marcaSelect, { target: { value: "10" } });

      await waitFor(() => {
        expect(mockedModelosFiltrados).toHaveBeenCalledWith("1", "10");
      });

      await waitFor(() => {
        expect(screen.getByText("COROLLA")).toBeInTheDocument();
        expect(screen.getByText("YARIS")).toBeInTheDocument();
      });
    });

    it("clears modelo selection when categoria changes", async () => {
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      // Select both
      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/^marca /i), { target: { value: "10" } });

      await waitFor(() => {
        expect(screen.getByText("COROLLA")).toBeInTheDocument();
      });

      // Select a modelo
      fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "100" } });

      // Now change categoria
      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "2" } });

      // Modelo select should be reset to placeholder
      await waitFor(() => {
        const modeloSelect = screen.getByLabelText(/modelo/i) as HTMLSelectElement;
        expect(modeloSelect.value).toBe("");
      });
    });

    it("fetches modelos on edit when detail has categoria and marca", async () => {
      mockedDetail.mockResolvedValue({ success: true as const, data: mockDetail });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true, "42");

      await waitFor(() => {
        expect(mockedDetail).toHaveBeenCalledWith("42");
      });

      // Cascading fetch should fire once both categoria and marca are set from detail
      await waitFor(() => {
        expect(mockedModelosFiltrados).toHaveBeenCalledWith("1", "10");
      });

      // Modelo select should show the saved value
      await waitFor(() => {
        const modeloSelect = screen.getByLabelText(/modelo/i) as HTMLSelectElement;
        expect(modeloSelect.value).toBe("100");
      });
    });

    it("shows loading indicator in modelo field while fetching", async () => {
      mockedModelosFiltrados.mockReturnValue(new Promise(() => {}));

      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/^marca /i), { target: { value: "10" } });

      await waitFor(() => {
        expect(screen.getByText(/cargando modelos/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form fields", () => {
    it("renders all form fields", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByLabelText(/año ejercicio/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^marca /i)).toBeInTheDocument();
        expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^año\s+\*$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/monto/i)).toBeInTheDocument();
      });
    });

    it("shows read-only código field when editing", async () => {
      mockedDetail.mockResolvedValue({ success: true as const, data: mockDetail });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true, "42");

      await waitFor(() => {
        expect(screen.getByDisplayValue("42")).toBeInTheDocument();
      });

      const codigoInput = screen.getByDisplayValue("42");
      expect(codigoInput).toHaveAttribute("readOnly");
    });

    it("does not show código field when creating", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      expect(screen.queryByDisplayValue("42")).not.toBeInTheDocument();
    });
  });

  describe("Estado radio buttons", () => {
    it("defaults to Activo when creating", async () => {
      renderModal(true);

      await waitFor(() => {
        const radioActivo = screen.getByLabelText(/^activo$/i) as HTMLInputElement;
        expect(radioActivo.checked).toBe(true);
      });
    });

    it("shows Activo when editing with ACTIVO estado", async () => {
      mockedDetail.mockResolvedValue({ success: true as const, data: mockDetail });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true, "42");

      await waitFor(() => {
        const radioActivo = screen.getByLabelText(/^activo$/i) as HTMLInputElement;
        expect(radioActivo.checked).toBe(true);
      });
    });

    it("shows Inactivo when editing with INACTIVO estado", async () => {
      mockedDetail.mockResolvedValue({
        success: true as const,
        data: { ...mockDetail, estado: "INACTIVO" },
      });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true, "42");

      await waitFor(() => {
        const radioInactivo = screen.getByLabelText(/inactivo/i) as HTMLInputElement;
        expect(radioInactivo.checked).toBe(true);
      });
    });

    it("toggles between Activo and Inactivo", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      const radioActivo = screen.getByLabelText(/^activo$/i) as HTMLInputElement;
      const radioInactivo = screen.getByLabelText(/inactivo/i) as HTMLInputElement;

      expect(radioActivo.checked).toBe(true);
      expect(radioInactivo.checked).toBe(false);

      fireEvent.click(radioInactivo);

      expect(radioActivo.checked).toBe(false);
      expect(radioInactivo.checked).toBe(true);
    });
  });

  describe("Validation", () => {
    it("shows errors for all required fields when submitting empty form", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Año Ejercicio es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/Categoría es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/Marca es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/Modelo es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/Año es requerido/i)).toBeInTheDocument();
        expect(screen.getByText(/Monto es requerido/i)).toBeInTheDocument();
      });
    });

    it("shows error for non-positive monto", async () => {
      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      const montoInput = screen.getByLabelText(/monto/i);
      fireEvent.change(montoInput, { target: { value: "-100" } });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Monto debe ser un número positivo/i)).toBeInTheDocument();
      });
    });
  });

  describe("Save flow", () => {
    it("calls saveValorAction with correct payload for new record", async () => {
      mockedSave.mockResolvedValue({ success: true as const });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      // Fill form
      fireEvent.change(screen.getByLabelText(/año ejercicio/i), { target: { value: "2025" } });
      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/^marca /i), { target: { value: "10" } });

      await waitFor(() => {
        expect(screen.getByText("COROLLA")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/^año\s+\*$/i), { target: { value: "2023" } });
      fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "50000" } });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedSave).toHaveBeenCalledTimes(1);
      });

      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id_anio: "2025",
          id_categoria: "1",
          id_marca: "10",
          id_modelo: "M001",
          anio: "2023",
          monto: 50000,
          estado: "1",
          xidmod: "100",
        }),
      );
      // No id for new records
      expect(mockedSave).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: expect.any(String) }),
      );
    });

    it("calls saveValorAction with id for editing", async () => {
      mockedDetail.mockResolvedValue({ success: true as const, data: mockDetail });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });
      mockedSave.mockResolvedValue({ success: true as const });

      renderModal(true, "42");

      await waitFor(() => {
        expect(mockedDetail).toHaveBeenCalledWith("42");
      });

      await waitFor(() => {
        expect(screen.getByDisplayValue("42")).toBeInTheDocument();
      });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedSave).toHaveBeenCalledTimes(1);
      });

      expect(mockedSave).toHaveBeenCalledWith(
        expect.objectContaining({ id: "42" }),
      );
    });

    it("calls onSaved and onClose after successful save", async () => {
      mockedSave.mockResolvedValue({ success: true as const });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      const { onClose, onSaved } = renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/año ejercicio/i), { target: { value: "2025" } });
      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/^marca /i), { target: { value: "10" } });

      await waitFor(() => {
        expect(screen.getByText("COROLLA")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/^año\s+\*$/i), { target: { value: "2023" } });
      fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "50000" } });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockedSave).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    it("shows save error banner on failure", async () => {
      mockedSave.mockResolvedValue({ success: false as const, error: "Error del servidor" });
      mockedModelosFiltrados.mockResolvedValue({ success: true as const, data: mockModelos });

      renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("SEDAN")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/año ejercicio/i), { target: { value: "2025" } });
      fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/^marca /i), { target: { value: "10" } });

      await waitFor(() => {
        expect(screen.getByText("COROLLA")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/modelo/i), { target: { value: "100" } });
      fireEvent.change(screen.getByLabelText(/^año\s+\*$/i), { target: { value: "2023" } });
      fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "50000" } });

      const saveButton = screen.getByText("Guardar Datos");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("Error del servidor")).toBeInTheDocument();
      });
    });
  });

  describe("Loading and error states", () => {
    it("shows loading spinner while fetching detail", async () => {
      mockedDetail.mockReturnValue(new Promise(() => {}));

      renderModal(true, "42");

      await waitFor(() => {
        expect(screen.getByText(/cargando datos del valor/i)).toBeInTheDocument();
      });
    });

    it("shows fetch error with retry button", async () => {
      mockedDetail.mockResolvedValue({ success: false as const, error: "Error de carga" });

      renderModal(true, "42");

      await waitFor(() => {
        expect(screen.getByText("Error de carga")).toBeInTheDocument();
      });

      expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
    });

    it("retry button triggers fetch again", async () => {
      mockedDetail
        .mockResolvedValueOnce({ success: false as const, error: "Error de carga" })
        .mockResolvedValueOnce({ success: true as const, data: mockDetail });

      renderModal(true, "42");

      await waitFor(() => {
        expect(screen.getByText("Error de carga")).toBeInTheDocument();
      });

      const retryButton = screen.getByRole("button", { name: /reintentar/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockedDetail).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Close behavior", () => {
    it("calls onClose when clicking the X button", async () => {
      const { onClose } = renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText("Cerrar");
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose when clicking outside the modal", async () => {
      const { onClose } = renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      // Click the overlay backdrop
      const overlay = screen.getByRole("heading", { name: /nuevo valor/i })
        .closest(".fixed.inset-0") as HTMLElement;
      fireEvent.click(overlay);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose on Escape key", async () => {
      const { onClose } = renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      // The overlay div has tabIndex={-1} and the onKeyDown handler
      const overlay = screen.getByText("Nuevo Valor").closest('[tabindex="-1"]') as HTMLElement;
      fireEvent.keyDown(overlay, {
        key: "Escape",
        code: "Escape",
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onClose via the Cerrar button in footer", async () => {
      const { onClose } = renderModal(true);

      await waitFor(() => {
        expect(screen.getByText("Nuevo Valor")).toBeInTheDocument();
      });

      const cerrarButtons = screen.getAllByText("Cerrar");
      // Should have at least the footer Cerrar
      const footerCerrar = cerrarButtons.find(
        (btn) => btn.tagName === "BUTTON",
      );
      if (footerCerrar) fireEvent.click(footerCerrar);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
