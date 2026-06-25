import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import {
  searchViasAction,
  getTiposUrbanizacionAction,
  createUrbanizacionAction,
  getUrbanizacionAction,
  updateUrbanizacionAction,
} from "./mantenimiento-vias";

const mockedCookies = vi.mocked(cookies);

const API_BASE = 'http://localhost:3001/api';

describe("mantenimiento-vias actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchViasAction", () => {
    it("calls POST /mantenimiento-vias/search with correct body, URL, and Cookie header", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      await searchViasAction({ codigo: 'ADM', page: 1, pageSize: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/mantenimiento-vias/search`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ codigo: 'ADM', page: 1, pageSize: 20 }),
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
    });

    it("returns { success, data, total, page, pageSize, totalPages } on 200", async () => {
      const mockData = [
        { vlogin: 'jperez' },
        { vlogin: 'mgarcia' },
      ];
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: mockData,
          total: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await searchViasAction({ codigo: 'EMP001' });

      expect(result).toEqual({
        success: true,
        data: mockData,
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it("returns { success: false, error } on network error", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await searchViasAction({});

      expect(result).toEqual({
        success: false,
        error: 'Failed to fetch',
      });
    });

    it("returns { success: false, error } on 400 response", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ message: 'Invalid filters' }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await searchViasAction({ estado: 'invalid' });

      expect(result).toEqual({
        success: false,
        error: 'Invalid filters',
      });
    });
  });

  // ── Urbanizaciones CRUD actions ──────────────────────────

  describe("getTiposUrbanizacionAction", () => {
    it("calls GET /mantenimiento-vias/combos/tipos-urbanizacion and returns data", async () => {
      const mockData = [{ id: "RB", abrev: "RB", nombre: "Residencial" }];
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockData }),
      });
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await getTiposUrbanizacionAction();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/mantenimiento-vias/combos/tipos-urbanizacion`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, data: mockData });
    });

    it("returns error envelope on network failure", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await getTiposUrbanizacionAction();

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe("createUrbanizacionAction", () => {
    const payload = {
      id_urba: "U001",
      tipourb: "RB",
      nombabr: "URB TEST",
      nombre: "URBANIZACION TEST",
      nestado: "1",
      operador: "jperez",
      estacion: "PC-001",
    };

    it("calls POST /mantenimiento-vias/urbanizaciones with payload and returns message", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "Urbanización registrada correctamente" }),
      });
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await createUrbanizacionAction(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/mantenimiento-vias/urbanizaciones`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, message: "Urbanización registrada correctamente" });
    });

    it("returns error envelope on network failure", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await createUrbanizacionAction(payload);

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe("getUrbanizacionAction", () => {
    const mockData = {
      id_urba: "U001",
      tipourb: "RB",
      nombabr: "URB TEST",
      nombre: "URBANIZACION TEST",
      nestado: "1",
    };

    it("calls GET /mantenimiento-vias/urbanizaciones/:id_urba with encoded id", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: mockData }),
      });
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await getUrbanizacionAction("U001");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/mantenimiento-vias/urbanizaciones/U001`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, data: mockData });
    });

    it("returns error envelope on network failure", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await getUrbanizacionAction("U001");

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });

  describe("updateUrbanizacionAction", () => {
    const payload = {
      tipourb: "RB",
      nombabr: "URB UPD",
      nombre: "URBANIZACION ACTUALIZADA",
      nestado: "1",
      estacion: "PC-001",
    };

    it("calls PUT /mantenimiento-vias/urbanizaciones/:id_urba with payload and returns message", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ message: "Urbanización actualizada correctamente" }),
      });
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await updateUrbanizacionAction("U001", payload);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/mantenimiento-vias/urbanizaciones/U001`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(payload),
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, message: "Urbanización actualizada correctamente" });
    });

    it("returns error envelope on network failure", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error('Network error'));
      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await updateUrbanizacionAction("U001", payload);

      expect(result).toEqual({ success: false, error: 'Network error' });
    });
  });
});
