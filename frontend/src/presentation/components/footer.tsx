"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const currentYear = new Date().getFullYear();
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200 rounded-full p-0.5 shadow-sm hover:bg-slate-50 transition-colors"
        title={isVisible ? "Ocultar pie de página" : "Mostrar pie de página"}
      >
        {isVisible ? (
          <ChevronDown size={12} className="text-slate-500" />
        ) : (
          <ChevronUp size={12} className="text-slate-500" />
        )}
      </button>
      
      {isVisible && (
        <footer className="py-3 px-6 border-t border-slate-200 bg-white/50 text-slate-500 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sat-navy font-outfit text-xs">SIGMUN</span>
            <span className="text-slate-300">|</span>
            <p className="font-inter text-[10px]">Sistema Integral de Gestión Municipal</p>
          </div>
          
          <div className="flex items-center gap-4 font-inter">
            <p className="text-[10px]">© {currentYear} SAT ICA. Todos los derechos reservados.</p>
            <div className="flex gap-3">
              <a href="#" className="hover:text-sat-cyan transition-colors text-[10px]">Términos</a>
              <a href="#" className="hover:text-sat-cyan transition-colors text-[10px]">Privacidad</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
