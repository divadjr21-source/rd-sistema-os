"use client";

import { useToasts } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

const variantStyles = {
  success: "border-emerald-450/40 bg-emerald-450/10 text-emerald-450",
  error: "border-danger/40 bg-danger/10 text-danger",
  info: "border-info/40 bg-info/10 text-info",
};

const variantIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => {
        const Icon = variantIcons[t.variant];
        return (
          <div
            key={t.id}
            role="alert"
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur bg-graphite-900/95",
              variantStyles[t.variant]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.description && (
                <p className="text-xs text-graphite-300 mt-0.5 break-words">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-graphite-400 hover:text-foreground flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
