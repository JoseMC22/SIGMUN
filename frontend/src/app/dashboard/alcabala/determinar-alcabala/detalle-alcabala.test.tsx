import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import DetalleAlcabala from "./detalle-alcabala";
import type { AlcabalaItem } from "@/actions/alcabala/determinar-alcabala";

const mockAlcabala: AlcabalaItem = {
  idAlcabala: 5296,
  fechaRegistro: "8/06/2021 10:20",
  montoAlcabala: 13680.0,
  codPred: "010195288",
  anioPred: "2021",
  codigoVenta: "0211949",
  estado: "1",
};

describe("DetalleAlcabala", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <DetalleAlcabala open={false} onClose={vi.fn()} alcabala={mockAlcabala} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when alcabala is null", () => {
    const { container } = render(
      <DetalleAlcabala open={true} onClose={vi.fn()} alcabala={null} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders alcabala detail when open", () => {
    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} alcabala={mockAlcabala} />,
    );
    expect(screen.getByText("Detalle de Alcabala")).toBeDefined();
    expect(screen.getByText("5296")).toBeDefined();
    expect(screen.getByText("8/06/2021 10:20")).toBeDefined();
    expect(screen.getByText("S/ 13680.00")).toBeDefined();
    expect(screen.getByText("010195288")).toBeDefined();
    expect(screen.getByText("2021")).toBeDefined();
    expect(screen.getByText("0211949")).toBeDefined();
    expect(screen.getByText("Activo")).toBeDefined();
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} alcabala={mockAlcabala} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} alcabala={mockAlcabala} />,
    );
    const backdrop = document.querySelector("[aria-hidden='true']");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Cerrar button is clicked", () => {
    const onClose = vi.fn();
    render(
      <DetalleAlcabala open={true} onClose={onClose} alcabala={mockAlcabala} />,
    );
    fireEvent.click(screen.getByText("Cerrar"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows Anulado badge for estado 2", () => {
    const anulada = { ...mockAlcabala, estado: "2" };
    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} alcabala={anulada} />,
    );
    expect(screen.getByText("Anulado")).toBeDefined();
  });

  it("shows Inactivo badge for estado 0", () => {
    const inactiva = { ...mockAlcabala, estado: "0" };
    render(
      <DetalleAlcabala open={true} onClose={vi.fn()} alcabala={inactiva} />,
    );
    expect(screen.getByText("Inactivo")).toBeDefined();
  });
});
