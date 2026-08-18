"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { fetchObjectPermissionsAction } from "./access-actions";
import { useRouter } from "next/navigation";

export interface AccessContextValue {
  permissions: Map<string, boolean>;
  loading: boolean;
  hasAccess: (idObjeto: string) => boolean;
  loadPermissions: (idAcceso: string) => Promise<void>;
  invalidatePermissions: (idAcceso: string) => void;
}

const AccessContext = createContext<AccessContextValue | null>(null);

function useSsePermissions(loadPermissions: (idAcceso: string) => void) {
  const router = useRouter();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    const eventSource = new EventSource(`${apiUrl}/seguridad/object-access/events`, {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "access:invalidated") {
          loadPermissions(data.id_acceso);
        }
      } catch {
        // JSON parse error - ignore
      }
    };

    eventSource.onerror = () => {
      setReconnectAttempts((prev) => {
        const next = Math.min(prev + 1, 5);
        if (next >= 5) {
          return prev;
        }
        // EventSource se reconecta automáticamente después de un retraso
        // No necesitamos llamar a .connect() explícito
        const delay = Math.pow(2, prev) * 1000; // 1s, 2s, 4s, 8s, 16s...
        setTimeout(() => {
          loadPermissions("");
        }, delay);
        return next;
      });
    };

    return () => {
      eventSource.close();
    };
  }, [loadPermissions, router]);

  return null;
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [permissions, setPermissions] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [loading, setLoading] = useState(true);

  const loadPermissions = useCallback(async (idAcceso: string) => {
    try {
      const result = await fetchObjectPermissionsAction(idAcceso);
      if (result.success && result.data) {
        const map = new Map<string, boolean>();
        for (const p of result.data) {
          map.set(p.id_objeto, p.bacceso === 1);
        }
        setPermissions(map);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const hasAccess = useCallback(
    (idObjeto: string) => permissions.get(idObjeto) === true,
    [permissions],
  );

  const invalidatePermissions = useCallback((_idAcceso: string) => {
    setPermissions(new Map());
  }, []);

  // Iniciar SSE después de cargar las primeras permissions
  useSsePermissions(loadPermissions);

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

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error("useAccess must be used within an AccessProvider");
  }
  return ctx;
}