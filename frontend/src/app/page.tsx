"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import SatIcaLogo from "@/components/logo";
import {
  storeAuth,
  clearAuth,
} from "@/lib/api";
import { loginAction, logoutAction } from "@/actions/auth/auth";
import { useRef } from "react";

export default function LoginPage() {
  const router = useRouter();

  // Estados del formulario
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados de interacción asíncrona
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Limpiar estados al cancelar
  const handleClear = () => {
    setUsername("");
    setErrorMessage("");
    setLoginSuccess(false);
  };

  const handleLogout = async () => {
    await logoutAction();
    clearAuth();
    setCurrentUser(null);
    handleClear();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const passwordValue = passwordRef.current?.value ?? "";
    if (!username.trim() || !passwordValue.trim()) {
      setErrorMessage("Por favor, ingrese su usuario y contraseña.");
      return;
    }

    setIsLoading(true);

    try {
      // Usamos FormData para que Next.js maneje el envío de forma segura vía Server Action
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", btoa(passwordValue));

      const result = await loginAction(formData);

      // Borrar contraseña del estado inmediatamente después de usarla
      if (passwordRef.current) {
        passwordRef.current.value = "";
      }

      if (result.success && result.user) {
        storeAuth(result.user);
        setCurrentUser(result.user);
        setLoginSuccess(true);

        // Marca esta pestaña como "logueada" — sessionStorage se borra al cerrar la pestaña
        sessionStorage.setItem("sigmun_session", "1");

        setTimeout(() => {
          router.push("/dashboard");
        }, 1500);
      } else {
        setLoginSuccess(false);
        setErrorMessage(result.error || "Credenciales incorrectas.");
      }
    } catch (error: unknown) {
      setLoginSuccess(false);
      setErrorMessage("Error de conexión con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden select-none bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      
      {/* ========================================================
          DISEÑO DEFINITIVO - OPCIÓN 1: MODERN SPLIT PANEL (50/50)
          ======================================================== */}
      <div className="flex flex-1 flex-row min-h-screen w-full transition-opacity duration-500 ease-in-out animate-fade-in">
        
        {/* LADO IZQUIERDO: Branding y Elementos Corporativos */}
        <div className="hidden lg:flex w-1/2 bg-linear-to-br from-sat-navy to-[#004B91] flex-col justify-between p-16 text-clean-white relative overflow-hidden">
          
          {/* Elementos abstractos decorativos (Malla geométrica y orbes) */}
          <div className="absolute inset-0 opacity-15">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Resplandor decorativo */}
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-sat-cyan/20 blur-3xl" />
          
          {/* Header del panel izquierdo */}
          <div className="z-10 flex items-center gap-2">
            {/* Opcional: Espacio para logos secundarios o textos pequeños */}
          </div>

          {/* Contenedor central de Identidad con el Logo */}
          <div className="z-10 flex flex-col items-start gap-8 max-w-lg">
            <div className="w-72">
              {/* Logo oficial cargado desde logo_sat_2026.jpeg */}
              <SatIcaLogo className="w-full" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight font-outfit text-white">
                Sistema Integrado de <br />
                <span className="text-sat-cyan">Gestión Municipal</span>
              </h1>
              <p className="text-lg text-slate-200/90 leading-relaxed font-light">
                Servicio de Administración Tributaria de Ica. Hacia una plataforma más ágil, segura y enfocada en el progreso de nuestra ciudad.
              </p>
            </div>
          </div>

          {/* Footer institucional del panel izquierdo */}
          <div className="z-10 text-xs text-slate-300 font-medium">
            &copy; {new Date().getFullYear()} SAT ICA. Todos los derechos reservados.
          </div>
        </div>

        {/* LADO DERECHO: Formulario de Autenticación */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
          
          {/* Espacio superior para balance visual */}
          <div className="hidden lg:block text-right text-xs text-slate-400 font-medium">
            Servidor Seguro | SSL 256-bit
          </div>

          {/* Contenedor central del Formulario */}
          <div className="w-full max-w-md mx-auto my-auto py-12">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700/50 transition-all duration-300">
              
              {/* Cabecera del formulario */}
              <div className="flex flex-col items-center text-center mb-8">
                {/* Logo en versión pequeña para móviles */}
                <div className="block lg:hidden w-36 mb-4">
                  <SatIcaLogo />
                </div>
                
                {/* Icono de Candado Seguro */}
                <div className="hidden lg:flex items-center justify-center w-12 h-12 bg-sat-navy/5 dark:bg-sat-cyan/10 rounded-full mb-3 text-sat-navy dark:text-sat-cyan">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                
                <h2 className="text-2xl font-bold tracking-tight font-outfit text-sat-navy dark:text-white">
                  Ingreso al Sistema
                </h2>
                <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
                  Acceso restringido solo para usuarios autorizados. Por favor ingrese su usuario y contraseña.
                </p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                
                {/* Campo de Usuario */}
                <div>
                  <label 
                    htmlFor="username-1" 
                    className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide"
                  >
                    Usuario
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <input
                      id="username-1"
                      type="text"
                      disabled={isLoading || loginSuccess}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ej. jgonzales"
                      className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700/80 rounded-xl text-sm placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/35 focus:border-sat-cyan transition-all duration-200 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Campo de Contraseña */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label 
                      htmlFor="password-1" 
                      className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide"
                    >
                      Contraseña
                    </label>
                    <a href="#" className="text-xs font-medium text-sat-cyan hover:underline transition-all">
                      ¿Olvidó su contraseña?
                    </a>
                  </div>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      id="password-1"
                      type={showPassword ? "text" : "password"}
                      disabled={isLoading || loginSuccess}
                      ref={passwordRef}
                      placeholder="••••••••"
                      className="block w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700/80 rounded-xl text-sm placeholder-slate-400 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sat-cyan/35 focus:border-sat-cyan transition-all duration-200 disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recordar dispositivo */}
                <div className="flex items-center">
                  <input
                    id="remember-1"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sat-cyan focus:ring-sat-cyan/30 focus:ring-2 accent-sat-cyan transition-colors"
                  />
                  <label htmlFor="remember-1" className="ml-2.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Recordar credenciales en este dispositivo
                  </label>
                </div>

                {/* Feedback de error */}
                {errorMessage && (
                  <div className="flex items-center gap-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/30 text-xs font-medium animate-slide-up">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Feedback de Éxito */}
                {loginSuccess && (
                  <div className="flex items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-semibold animate-slide-up">
                    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>¡Ingreso exitoso! Redireccionando al panel...</span>
                  </div>
                )}

                {/* Botones de Acción (Ingresar / Cancelar) */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  
                  {/* Botón Cancelar */}
                  <button
                    type="button"
                    disabled={isLoading || loginSuccess}
                    onClick={handleClear}
                    className="order-2 sm:order-1 sm:w-1/3 px-4 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  {/* Botón Ingresar */}
                  <button
                    type="submit"
                    disabled={isLoading || loginSuccess}
                    className="order-1 sm:order-2 flex-1 relative bg-linear-to-r from-sat-navy to-[#004B91] hover:from-[#001D3D] hover:to-sat-navy text-white text-sm font-bold py-3 px-5 rounded-xl shadow-lg hover:shadow-xl dark:shadow-sat-cyan/5 border border-transparent dark:border-white/5 transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sat-navy/50 disabled:opacity-50 cursor-pointer overflow-hidden flex items-center justify-center min-h-11.5"
                  >
                    {isLoading ? (
                      /* Spinner animado (Skeleton/Estado de Carga) */
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Validando...</span>
                      </div>
                    ) : loginSuccess ? (
                      <span>Bienvenido</span>
                    ) : (
                      <span>Ingresar al Sistema</span>
                    )}
                  </button>

                </div>

              </form>

            </div>
          </div>

          {/* Footer inferior (Responsivo) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="lg:hidden">&copy; {new Date().getFullYear()} SAT ICA</span>
            <div className="flex gap-4">
              <a href="#" className="hover:underline">Políticas de Seguridad</a>
              <a href="#" className="hover:underline">Términos de Servicio</a>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
