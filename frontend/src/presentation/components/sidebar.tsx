"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ChevronDown, 
  ChevronRight, 
  LayoutDashboard,
  LogOut,
  User,
  ShieldCheck,
  Wallet,
  Search,
  HandCoins,
  Lock,
  KeyRound,
  Car,
  Map,
  Gavel,
  BarChart3,
  Receipt,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchModulesAction,
  fetchSubmenusAction,
} from "@/actions/menu";

interface ModuleData {
  id: string;
  title: string;
}

interface SubmenuData {
  id: string;
  title: string;
  path: string;
  icon: string;
  form: string;
}
import SatIcaLogo from "@/components/logo";

const MODULE_ICONS: Record<string, any> = {
  "Administración Tributaria": ShieldCheck,
  "Tesorería Municipal": Wallet,
  "Fiscalización Tributaria": Search,
  "Cobranza De Deuda": HandCoins,
  "Cobranza de Deuda": HandCoins,
  "Impuesto Vehicular": Car,
  Catastro: Map,
  Coactivo: Gavel,
  "Reportes Gerenciales": BarChart3,
  Alcabala: Receipt,
};

function getModuleIcon(title: string) {
  return MODULE_ICONS[title] ?? LayoutDashboard;
}

export function Sidebar() {
  const pathname = usePathname();
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [submenusCache, setSubmenusCache] = useState<Record<string, SubmenuData[]>>({});
  const [loadingModules, setLoadingModules] = useState(true);
  const [loadingSubmenus, setLoadingSubmenus] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModulesAction()
      .then((data) => {
        setModules(data);
        setError(null);
      })
      .catch(() => setError("Error al cargar el menú"))
      .finally(() => setLoadingModules(false));
  }, []);

  const toggleModule = useCallback(
    async (moduleId: string) => {
      const isOpening = !openModules.includes(moduleId);
      setOpenModules(isOpening ? [moduleId] : []);

      if (isOpening && !submenusCache[moduleId]) {
        setLoadingSubmenus((prev) => ({ ...prev, [moduleId]: true }));
        try {
          const data = await fetchSubmenusAction(moduleId);
          setSubmenusCache((prev) => ({ ...prev, [moduleId]: data }));
        } catch {
          setSubmenusCache((prev) => ({ ...prev, [moduleId]: [] }));
        } finally {
          setLoadingSubmenus((prev) => ({ ...prev, [moduleId]: false }));
        }
      }
    },
    [openModules, submenusCache],
  );

  const renderModule = (module: ModuleData) => {
    const Icon = getModuleIcon(module.title);
    const isOpen = openModules.includes(module.id);
    const submenus = submenusCache[module.id] ?? [];
    const isLoading = loadingSubmenus[module.id];
    const isActive = submenus.some((s) => pathname === `/dashboard/${s.path}`);

    return (
      <div key={module.id} className="space-y-1">
        <button
          onClick={() => toggleModule(module.id)}
          className={cn(
            "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 group",
            isOpen || isActive
              ? "bg-white/10 text-sat-cyan"
              : "text-slate-300 hover:bg-white/5 hover:text-white",
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-transform",
              isActive && "scale-110",
            )}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left font-medium text-xs font-inter">
                {module.title}
              </span>
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin opacity-50" />
              ) : isOpen ? (
                <ChevronDown className="w-3 h-3 opacity-50" />
              ) : (
                <ChevronRight className="w-3 h-3 opacity-50" />
              )}
            </>
          )}
        </button>

        {isOpen && !isCollapsed && (
          <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
            {submenus.map((submenu) => (
              <Link
                key={submenu.id}
                href={`/dashboard/${submenu.path}`}
                className={cn(
                  "block px-2 py-1.5 text-xs rounded-lg transition-colors relative",
                  pathname === `/dashboard/${submenu.path}`
                    ? "text-white font-semibold bg-white/5"
                    : "text-slate-400 hover:text-white hover:bg-white/5",
                )}
              >
                {pathname === `/dashboard/${submenu.path}` && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-sat-cyan shadow-[0_0_8px_#00A9E0]" />
                )}
                {submenu.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "relative h-screen bg-sat-navy text-white transition-all duration-300 flex flex-col border-r border-white/10 shadow-2xl",
        isCollapsed ? "w-16" : "w-60",
      )}
    >
      <div className="p-4 flex items-center justify-center border-b border-white/5">
        {!isCollapsed && (
          <div className="flex items-center justify-center animate-in fade-in slide-in-from-left-4 duration-500">
            <SatIcaLogo className="w-24" />
          </div>
        )}
        {isCollapsed && <SatIcaLogo className="w-10" />}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
        <div className="space-y-1">
          {loadingModules ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <p className="text-xs text-red-400 text-center px-2 py-4">{error}</p>
          ) : modules.length === 0 ? (
            <p className="text-xs text-slate-400 text-center px-2 py-4">
              No hay módulos disponibles
            </p>
          ) : (
            modules.map(renderModule)
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-white/5 bg-black/20">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-1.5 hover:bg-white/5 rounded-lg transition-colors mb-3 text-slate-400 hover:text-white"
        >
          {isCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronRight size={16} className="rotate-180" />
          )}
        </button>
      </div>
    </aside>
  );
}
