"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { clearAuth } from "@/lib/api";

const INACTIVITY_MS = 20 * 60 * 1000; // 20 minutos

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

/**
 * Componente invisible que monitorea la actividad del usuario.
 * Si no hay actividad durante 20 minutos, cierra la sesión y redirige al login.
 */
export function IdleTimer() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        await logoutAction();
        clearAuth();
        router.replace("/");
      }, INACTIVITY_MS);
    }

    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [router]);

  return null;
}
