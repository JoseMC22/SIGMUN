"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchObjectPermissionsAction } from "./access-actions";

export interface AccessContextValue {
  permissions: Map<string, boolean>;
  loading: boolean;
  hasAccess: (idObjeto: string) => boolean;
  loadPermissions: (idAcceso: string) => Promise<void>;
  invalidatePermissions: () => void;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(false);

  // ── Load permissions for a given id_acceso ──
  const loadPermissions = useCallback(async (idAcceso: string) => {
    if (!idAcceso) return;
    setLoading(true);
    try {
      const result = await fetchObjectPermissionsAction(idAcceso);
      if (result.success && result.data) {
        const map = new Map<string, boolean>();
        for (const p of result.data) {
          map.set(p.id_objeto, p.bacceso === 1);
        }
        setPermissions(map);
      } else {
        setPermissions(new Map());
      }
    } catch {
      setPermissions(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  const hasAccess = useCallback(
    (idObjeto: string) => permissions.get(idObjeto) === true,
    [permissions],
  );

  const invalidatePermissions = useCallback(() => {
    setPermissions(new Map());
  }, []);

  const value = useMemo<AccessContextValue>(
    () => ({
      permissions,
      loading,
      hasAccess,
      loadPermissions,
      invalidatePermissions,
    }),
    [permissions, loading, hasAccess, loadPermissions, invalidatePermissions],
  );

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error("useAccess must be used within an AccessProvider");
  }
  return ctx;
}
