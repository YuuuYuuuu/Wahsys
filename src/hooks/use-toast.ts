"use client";

import * as React from "react";

type Toast = { id: string; title?: string; description?: string; variant?: "default" | "destructive" };

const listeners: Array<(toasts: Toast[]) => void> = [];
let memory: Toast[] = [];

export function toast(t: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  memory = [...memory, { ...t, id }];
  listeners.forEach((l) => l(memory));
  setTimeout(() => dismiss(id), 4000);
}

function dismiss(id: string) {
  memory = memory.filter((t) => t.id !== id);
  listeners.forEach((l) => l(memory));
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>(memory);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const i = listeners.indexOf(setToasts);
      if (i >= 0) listeners.splice(i, 1);
    };
  }, []);
  return { toasts, toast, dismiss };
}
