import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { type ReactNode } from "react";
import { AccessProvider, useAccess } from "./access-context";

// Mock server action
vi.mock("./access-actions", () => ({
  fetchObjectPermissionsAction: vi.fn(),
}));

import { fetchObjectPermissionsAction } from "./access-actions";
const mockedFetchPermissions = vi.mocked(fetchObjectPermissionsAction);

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AccessProvider>{children}</AccessProvider>;
  };
}

describe("AccessContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with loading=true and empty permissions", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      expect(result.current.loading).toBe(true);
      expect(result.current.permissions.size).toBe(0);
    });

    it("hasAccess returns false for any id when permissions are empty", () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      expect(result.current.hasAccess("any-id")).toBe(false);
      expect(result.current.hasAccess("btnGuardar")).toBe(false);
    });
  });

  describe("loadPermissions", () => {
    it("sets loading to false and populates permissions after fetch", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: true,
        data: [
          { id_objeto: "btnGuardar", bacceso: 1 },
          { id_objeto: "btnEliminar", bacceso: 0 },
        ],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.permissions.get("btnGuardar")).toBe(true);
      expect(result.current.permissions.get("btnEliminar")).toBe(false);
      expect(result.current.permissions.size).toBe(2);
    });

    it("replaces previous permissions on subsequent loads", async () => {
      mockedFetchPermissions
        .mockResolvedValueOnce({
          success: true,
          data: [{ id_objeto: "obj-a", bacceso: 1 }],
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id_objeto: "obj-b", bacceso: 1 }],
        });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("10");
      });
      expect(result.current.permissions.has("obj-a")).toBe(true);

      await act(async () => {
        await result.current.loadPermissions("20");
      });
      expect(result.current.permissions.has("obj-a")).toBe(false);
      expect(result.current.permissions.has("obj-b")).toBe(true);
    });

    it("sets loading=false even when fetch fails", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: false,
        error: "Network error",
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.permissions.size).toBe(0);
    });
  });

  describe("hasAccess", () => {
    it("returns true for id_objeto with bacceso=1", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: true,
        data: [
          { id_objeto: "btnGuardar", bacceso: 1 },
          { id_objeto: "btnEliminar", bacceso: 0 },
        ],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });

      expect(result.current.hasAccess("btnGuardar")).toBe(true);
    });

    it("returns false for id_objeto with bacceso=0", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: true,
        data: [
          { id_objeto: "btnGuardar", bacceso: 1 },
          { id_objeto: "btnEliminar", bacceso: 0 },
        ],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });

      expect(result.current.hasAccess("btnEliminar")).toBe(false);
    });

    it("returns false for unknown id_objeto", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: true,
        data: [{ id_objeto: "btnGuardar", bacceso: 1 }],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });

      expect(result.current.hasAccess("unknown-id")).toBe(false);
    });
  });

  describe("invalidatePermissions", () => {
    it("clears permissions for the given id_acceso", async () => {
      mockedFetchPermissions.mockResolvedValue({
        success: true,
        data: [{ id_objeto: "btnGuardar", bacceso: 1 }],
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useAccess(), { wrapper });

      await act(async () => {
        await result.current.loadPermissions("42");
      });
      expect(result.current.permissions.size).toBe(1);

      act(() => {
        result.current.invalidatePermissions("42");
      });

      expect(result.current.permissions.size).toBe(0);
    });
  });
});
