import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AlcabalasModal from "./alcabalas-modal";
import type { ContribuyenteItem, AlcabalaItem } from "@/actions/alcabala/determinar-alcabala";

// Mock AlcabalasTable to isolate modal behavior
vi.mock("./alcabalas-table", () => ({
  default: ({ data, loading }: { data: AlcabalaItem[]; loading: boolean }) => (
    <div data-testid="alcabalas-table">
      {loading ? "Cargando..." : `${data.length} registros`}
    </div>
  ),
}));

// Mock CrearAlcabalaModal to isolate AlcabalasModal behavior
vi.mock("./crear-alcabala-modal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="crear-alcabala-modal" /> : null,
}));

const mockContribuyente: ContribuyenteItem = {
  codigo: "0279126",
  paterno: "GARCIA",
  materno: "LOPEZ",
  nombres: "MARIA",
  numDoc: "12345678",
  direccion: "JR. PRINCIPAL 123",
  row: 1,
};

const mockAlcabalas: AlcabalaItem[] = [
  {
    idAlcabala: 1,
    fechaRegistro: "2024-01-15",
    montoAlcabala: 1500.5,
    codPred: "001",
    anioPred: "2024",
    codigoVenta: "V001",
    estado: "1",
  },
  {
    idAlcabala: 2,
    fechaRegistro: "2024-02-20",
    montoAlcabala: 2300.0,
    codPred: "002",
    anioPred: "2023",
    codigoVenta: "V002",
    estado: "0",
  },
];

describe("AlcabalasModal", () => {
  const onClose = vi.fn();
  const onCrearAlcabala = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders contribuyente info in header when open", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(
      screen.getByText(/0279126.*GARCIA.*LOPEZ.*MARIA/)
    ).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <AlcabalasModal
        open={false}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(screen.queryByText(/0279126/)).not.toBeInTheDocument();
  });

  it("calls onClose when Escape key is pressed", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cerrar button is clicked", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    fireEvent.click(screen.getByText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("passes alcabalas data to AlcabalasTable", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(screen.getByTestId("alcabalas-table")).toHaveTextContent(
      "2 registros"
    );
  });

  it("shows loading state when loading is true", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={[]}
        loading={true}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(screen.getByTestId("alcabalas-table")).toHaveTextContent(
      "Cargando..."
    );
  });

  // ── Footer ──────────────────────────────────────────────

  it("renders only the Cerrar button in the footer (Nueva Alcabala lives in the table toolbar)", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={mockContribuyente}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(screen.getByText("Cerrar")).toBeInTheDocument();
    // The modal footer no longer renders a "Nueva Alcabala" button;
    // the always-active "Nuevo" button lives in AlcabalasTable (covered
    // by alcabalas-table tests). The footer must not duplicate it.
    expect(screen.queryByText("Nueva Alcabala")).not.toBeInTheDocument();
  });

  it("renders the Cerrar button even when contribuyente is null (spec rev 2: no gating in modal)", () => {
    render(
      <AlcabalasModal
        open={true}
        onClose={onClose}
        contribuyente={null}
        alcabalas={mockAlcabalas}
        loading={false}
        onCrearAlcabala={onCrearAlcabala}
      />
    );

    expect(screen.getByText("Cerrar")).toBeInTheDocument();
    expect(screen.queryByText("Nueva Alcabala")).not.toBeInTheDocument();
  });
});
