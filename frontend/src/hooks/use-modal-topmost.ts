"use client";

import { useRef, useEffect, useCallback } from "react";

// ─── Stack global de modales abiertos ────────────────────────────────────────
//
// Cada modal que escucha "Escape" al abrirse debe registrarse en esta pila.
// El Escape solo dispara el cierre del modal que esté en la CIMA (el más
// recientemente abierto). Los demás lo ignoran.
//
// Ejemplo:
//   const modalId = useModalStack(isOpen);
//   useEffect(() => { ... }, [isOpen, onClose]);
//   // en el handler:
//   if (e.key === "Escape" && isTopModal(modalId)) onClose();
//
// El guard `isOpen` evita que un modal oculto consuma el Escape.

const _stack: symbol[] = [];

function push(id: symbol): void {
  _stack.push(id);
}

function pop(id: symbol): void {
  const i = _stack.indexOf(id);
  if (i !== -1) _stack.splice(i, 1);
}

export function isTopModal(id: symbol | null): boolean {
  if (id === null) return false;
  return _stack[_stack.length - 1] === id;
}

/**
 * Hook que mantiene el modal en la pila mientras esté abierto.
 * Devuelve el ID para poder chequear `isTopModal(id)`.
 */
export function useModalStack(isOpen: boolean): symbol {
  // symbol único por instancia react
  const idRef = useRef<symbol>(Symbol());
  const id = idRef.current;

  useEffect(() => {
    if (!isOpen) return;
    push(id);
    return () => pop(id);
  }, [isOpen, id]);

  return id;
}

// Nota: no se exporta un hook "Escape" aparte porque el callback con tipado
// genérico del evento de teclado es problemático en React 18. El patrón
// de uso explícito (modal arriba + isTopModal + onClose) es más seguro
// y fácil de auditar manualmente en cada modal.
