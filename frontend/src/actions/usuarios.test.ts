import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { cookies } from "next/headers";
import { searchUsuariosAction, fetchAreasAction, fetchPerfilesAction } from "./usuarios";

const mockedCookies = vi.mocked(cookies);

const API_BASE = 'http://localhost:3001/api';

describe("usuarios actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchUsuariosAction", () => {
    it("calls POST /seguridad/usuarios/search with correct body, URL, and Cookie header", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      await searchUsuariosAction({ codigo: '123', page: 1, pageSize: 20 });

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/seguridad/usuarios/search`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ codigo: '123', page: 1, pageSize: 20 }),
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
    });

    it("returns { success, data, total, page, pageSize, totalPages } on 200", async () => {
      const mockData = [
        { codigo: 'EMP001', nombre: 'Alice', area: 'IT', perfil: 'Admin', usuario: 'alice' },
      ];
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: mockData,
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await searchUsuariosAction({ codigo: 'EMP001' });

      expect(result).toEqual({
        success: true,
        data: mockData,
        total: 1,
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

      const result = await searchUsuariosAction({});

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

      const result = await searchUsuariosAction({ estado: 'invalid' });

      expect(result).toEqual({
        success: false,
        error: 'Invalid filters',
      });
    });
  });

  describe("fetchAreasAction", () => {
    it("calls GET /seguridad/usuarios/areas and returns data", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ area: 'IT', nombre: 'IT Department' }] }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await fetchAreasAction();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/seguridad/usuarios/areas`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, data: [{ area: 'IT', nombre: 'IT Department' }] });
    });
  });

  describe("fetchPerfilesAction", () => {
    it("calls GET /seguridad/usuarios/perfiles and returns data", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: '1', nombre: 'Admin' }] }),
      });

      mockedCookies.mockResolvedValue({ get: () => ({ value: 'test-token' }) });

      const result = await fetchPerfilesAction();

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/seguridad/usuarios/perfiles`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'SIGMUN_AUTH=test-token',
          }),
        }),
      );
      expect(result).toEqual({ success: true, data: [{ id: '1', nombre: 'Admin' }] });
    });
  });
});
