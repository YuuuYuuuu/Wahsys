"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            t.variant === "destructive"
              ? "rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm shadow-lg"
              : "rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg"
          }
        >
          {t.title && <p className="font-medium">{t.title}</p>}
          {t.description && <p className="text-muted-foreground">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}
