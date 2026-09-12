"use client";

import { useEffect, useState } from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(input: { title: string; description?: string; variant?: ToastVariant }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const item: ToastItem = {
    id,
    title: input.title,
    description: input.description,
    variant: input.variant || "info",
  };
  toasts = [...toasts, item];
  emit();
  setTimeout(() => removeToast(id), input.variant === "error" ? 7000 : 4000);
  return id;
}

// Extrai uma mensagem legível de qualquer formato de erro, incluindo os
// erros do Supabase/PostgREST, que são objetos simples no formato
// { message, details, hint, code } e NÃO são instâncias de Error — por
// isso "error instanceof Error" sozinho não é suficiente para capturá-los.
export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.hint, e.code ? `(código: ${e.code})` : null]
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length > 0) return parts.join(" — ");
  }
  return "Não foi possível salvar. Verifique sua conexão e tente novamente.";
}

// Atalho para exibir erros vindos do Supabase / exceções de forma padronizada.
export function toastError(error: unknown, fallbackTitle = "Erro ao salvar") {
  console.error(fallbackTitle, error);
  const description = extractErrorMessage(error);
  toast({ title: fallbackTitle, description, variant: "error" });
}

export function useToasts() {
  const [state, setState] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return { toasts: state, dismiss: removeToast };
}
