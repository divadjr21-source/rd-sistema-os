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

// Atalho para exibir erros vindos do Supabase / exceções de forma padronizada.
export function toastError(error: unknown, fallbackTitle = "Erro ao salvar") {
  const description =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Não foi possível salvar. Verifique sua conexão e tente novamente.";
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
