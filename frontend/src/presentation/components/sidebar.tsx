"use client";

import React, { useState } from "react";
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
  KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuModule } from "@/domain/models/menu";
import { MOCK_NAVIGATION } from "@/application/services/navigation.service";
import SatIcaLogo from "@/components/logo";

const IconMap: Record<string, any> = {
  ShieldCheck,
  Wallet,
  Search,
  HandCoins,
  Lock,
  LayoutDashboard,
  User
};

export function Sidebar() {
  const pathname = usePathname();
  const [openModules, setOpenModules] = useState<string[]>(["admin-trib"]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleModule = (id: string) => {
    setOpenModules(prev => 
      prev.includes(id) ? [] : [id]
    );
  };

  return (
    <aside 
      className={cn(
        "relative h-screen bg-sat-navy text-white transition-all duration-300 flex flex-col border-r border-white/10 shadow-2xl",
        isCollapsed ? "w-16" : "w-60"
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
          {MOCK_NAVIGATION.map((module) => {
            const Icon = IconMap[module.icon] || LayoutDashboard;
            const isOpen = openModules.includes(module.id);
            const isActive = module.submenus.some(s => pathname === s.path);

            return (
              <div key={module.id} className="space-y-1">
                <button
                  onClick={() => toggleModule(module.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-all duration-200 group",
                    isOpen || isActive 
                      ? "bg-white/10 text-sat-cyan" 
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0 transition-transform", isActive && "scale-110")} />
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-left font-medium text-xs font-inter">{module.title}</span>
                      {isOpen ? (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      ) : (
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      )}
                    </>
                  )}
                </button>

                {isOpen && !isCollapsed && (
                  <div className="ml-6 space-y-1 animate-in slide-in-from-top-2 duration-300">
                    {module.submenus.map((submenu) => (
                      <Link
                        key={submenu.id}
                        href={submenu.path}
                        className={cn(
                          "block px-2 py-1.5 text-xs rounded-lg transition-colors relative",
                          pathname === submenu.path
                            ? "text-white font-semibold bg-white/5"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {pathname === submenu.path && (
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-sat-cyan shadow-[0_0_8px_#00A9E0]" />
                        )}
                        {submenu.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-white/5 bg-black/20">
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-1.5 hover:bg-white/5 rounded-lg transition-colors mb-3 text-slate-400 hover:text-white"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
        </button>
        
        {/* <div className={cn("flex items-center gap-2 px-1", isCollapsed ? "justify-center" : "")}>
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-sat-cyan to-sat-navy flex items-center justify-center border border-white/20 shadow-lg">
            <User size={14} className="text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate font-outfit">J. Mozo</p>
              <p className="text-[10px] text-slate-400 truncate font-inter">Administrador</p>
            </div>
          )}
        </div> */}
      </div>
    </aside>
  );
}
