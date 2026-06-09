"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { checkSessionAction, logoutAction } from "@/actions/auth";
import { fetchAllowedPathsAction } from "@/actions/menu";
import { clearAuth } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
        const session = await checkSessionAction();
        if (!session.authenticated) {
          clearAuth();
          router.replace("/");
          return;
        }

        if (pathname === "/dashboard") {
          if (!cancelled) setAuthorized(true);
          return;
        }

        const allowedPaths = await fetchAllowedPathsAction();
        const currentPath = pathname.replace(/^\/dashboard\//, "");
        const hasAccess = allowedPaths.includes(currentPath);

        if (!hasAccess) {
          router.replace("/dashboard");
          return;
        }

        if (!cancelled) setAuthorized(true);
      } catch {
        clearAuth();
        router.replace("/");
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
