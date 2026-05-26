"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  LogOut,
  User,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { clearAuth } from "@/lib/api";
import { logoutAction } from "@/actions/auth";

export function Header() {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutAction();
    } catch {
    }
    clearAuth();
    router.push("/");
  };

  return (
    <header className="h-14 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-6 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-sat-cyan" />
        <div>
          <h1 className="text-sm font-bold text-sat-navy font-outfit leading-tight">SIGMUN</h1>
          <p className="text-[10px] text-slate-500 font-inter leading-tight">Sistema Integral de Gestión Municipal</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 font-outfit">Jesus Mozo</p>
            <p className="text-[10px] text-slate-500 font-inter">Administrador</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all border border-slate-200 overflow-hidden"
            >
              <User size={16} className="text-sat-navy" />
            </button>
            
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 px-1.5 z-30">
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-semibold text-slate-800 font-outfit">Jesus Mozo</p>
                    <p className="text-[10px] text-slate-500 font-inter">Administrador del Sistema</p>
                  </div>
                  <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <KeyRound size={14} /> Cambiar Contraseña
                  </button>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut size={14} /> Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
