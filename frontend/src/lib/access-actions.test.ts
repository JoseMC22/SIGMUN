import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import {
  fetchObjectPermissionsAction,
  invalidateObjectPermissionsAction,
} from "./access-actions";
import { cookies } from "next/headers";

const mockedCookies = vi.mocked(cookies);
const API_BASE = "http://localhost:3001/api";

const AUTH_COOKIE: RequestCookie = { name: "SIGMUN_AUTH", value: "test-token" };

function createMockRequestCookies(): ReadonlyRequestCookies {
  return {
    get: () => AUTH_COOKIE,
    getAll: () => [AUTH_COOKIE],
    has: () => true,
    set: vi.fn(),
    delete: vi.fn(),
    size: 0,
    toString: () => "SIGMUN_AUTH=test-token",
    [Symbol.iterator]() {
      return new Map<string, RequestCookie>([["SIGMUN_AUTH", AUTH_COOKIE]]).entries();
    },
  };
}

describe("access-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchObjectPermissionsAction", () => {
    it("calls GET /seguridad/object-access/:id_acceso with Cookie header", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          objects: [
            { id_objeto: "btnGuardar", bacceso: 1 },
            { id_objeto: "btnEliminar", bacceso: 0 },
          ],
        }),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      await fetchObjectPermissionsAction("42");

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/seguridad/object-access/42`,
        expect.objectContaining({
          cache: "no-store",
          headers: expect.objectContaining({
            Cookie: "SIGMUN_AUTH=test-token",
          }),
        }),
      );
    });

    it("returns { success, data } on 200", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          objects: [{ id_objeto: "btnGuardar", bacceso: 1 }],
        }),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      const result = await fetchObjectPermissionsAction("42");

      expect(result).toEqual({
        success: true,
        data: [{ id_objeto: "btnGuardar", bacceso: 1 }],
      });
    });

    it("returns { success: false, error } on non-200 response", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "Not found" }),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      const result = await fetchObjectPermissionsAction("999");

      expect(result).toEqual({
        success: false,
        error: "Not found",
      });
    });

    it("returns { success: false, error } on network error", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockRejectedValue(new Error("Network failure"));
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      const result = await fetchObjectPermissionsAction("42");

      expect(result).toEqual({
        success: false,
        error: "Network failure",
      });
    });
  });

  describe("invalidateObjectPermissionsAction", () => {
    it("calls POST /seguridad/object-access/invalidate with body", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      await invalidateObjectPermissionsAction("42", ["alice", "bob"]);

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/seguridad/object-access/invalidate`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Cookie: "SIGMUN_AUTH=test-token",
          }),
          body: JSON.stringify({ id_acceso: "42", usernames: ["alice", "bob"] }),
        }),
      );
    });

    it("returns { success: true } on 200", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      const result = await invalidateObjectPermissionsAction("42", ["alice"]);

      expect(result).toEqual({ success: true });
    });

    it("returns { success: false, error } on failure", async () => {
      const mockFetch = vi.fn();
      global.fetch = mockFetch as any;
      mockFetch.mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: "Forbidden" }),
      });
      mockedCookies.mockResolvedValue(createMockRequestCookies());

      const result = await invalidateObjectPermissionsAction("42", ["alice"]);

      expect(result).toEqual({
        success: false,
        error: "Forbidden",
      });
    });
  });
});
