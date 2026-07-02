"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkSessionAction, logoutAction } from "@/actions/auth";
import { fetchAllowedPathsAction } from "@/actions/menu";
import { clearAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";

const VERIFY_TIMEOUT_MS = 10_000; // 10 seconds max wait

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      // Si es una pestaña nueva, sessionStorage no tiene el flag → logout forzado
      if (typeof window !== "undefined" && !sessionStorage.getItem("sigmun_session")) {
        await logoutAction();
        clearAuth();
        if (!cancelled) router.replace("/");
        return;
      }

      try {
        // Race between session check and timeout
        const session = await Promise.race([
          checkSessionAction(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Session check timeout")), VERIFY_TIMEOUT_MS),
          ),
        ]);

        if (!session.authenticated) {
          clearAuth();
          if (!cancelled) router.replace("/");
          return;
        }

        // Always allow /dashboard base path
        if (pathname === "/dashboard") {
          if (!cancelled) setAuthorized(true);
          return;
        }

        // For sub-routes, verify access with timeout
        const allowedPaths = await Promise.race([
          fetchAllowedPathsAction(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Access check timeout")), VERIFY_TIMEOUT_MS),
          ),
        ]);

        const currentPath = pathname.replace(/^\/dashboard\//, "");
        const hasAccess = allowedPaths.includes(currentPath);

        if (!hasAccess) {
          if (!cancelled) router.replace("/dashboard");
          return;
        }

        if (!cancelled) setAuthorized(true);
      } catch {
        clearAuth();
        if (!cancelled) router.replace("/");
      }
    }

    verify();

    return () => { cancelled = true; };
  }, [router, pathname]);

  if (!authorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-sat-cyan" />
          <p className="text-sm text-slate-500 font-inter">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
