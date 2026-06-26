import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  login: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { loginAction, logoutAction, checkSessionAction } from "./auth";
import { login as apiLogin } from "@/lib/api";
import { cookies } from "next/headers";

const mockedApiLogin = vi.mocked(apiLogin);
const mockedCookies = vi.mocked(cookies);

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loginAction calls api.login and returns user metadata when successful", async () => {
    const expectedUser = {
      id: "user-1",
      username: "alice",
      fullName: "Alice Example",
      profileId: "profile-1",
      profileName: "Admin",
      areaId: "area-1",
      areaName: "IT",
      isEncargado: "no",
      isRemoto: false,
    };

    const setCookieMock = vi.fn();
    mockedCookies.mockResolvedValue({ set: setCookieMock });

    mockedApiLogin.mockResolvedValue({
      data: {
        authenticated: true,
        user: expectedUser,
        sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        message: 'Inicio de sesión exitoso.',
      },
      setCookie: "access_token=abc123; HttpOnly; Path=/",
    });

    const formData = new FormData();
    formData.set("username", "alice");
    formData.set("password", Buffer.from("password").toString("base64"));

    const result = await loginAction(formData);

    expect(mockedApiLogin).toHaveBeenCalledWith({ username: "alice", password: "password" });
    expect(setCookieMock).toHaveBeenCalledWith("SIGMUN_AUTH", "abc123", expect.objectContaining({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    }));
    expect(result).toEqual({ success: true, user: expectedUser });
  });

  it("logoutAction removes the auth cookie names when called", async () => {
    const deleteMock = vi.fn();
    mockedCookies.mockResolvedValue({ delete: deleteMock });

    const result = await logoutAction();

    expect(deleteMock).toHaveBeenCalledWith("SIGMUN_AUTH");
    expect(deleteMock).toHaveBeenCalledWith("access_token");
    expect(result).toEqual({ success: true });
  });

  it("checkSessionAction calls the backend session endpoint and returns authenticated state", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        authenticated: true,
        user: { id: 'user-1', name: 'Alice', roles: ['admin'] },
      }),
    };

    const mockFetch = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', mockFetch as any);

    const result = await checkSessionAction();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/session'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(result).toEqual({
      authenticated: true,
      user: { id: 'user-1', name: 'Alice', roles: ['admin'] },
    });

    vi.unstubAllGlobals();
  });
});
