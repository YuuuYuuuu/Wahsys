"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function HeaderActions({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    function updateTarget() {
      const isMobile = window.innerWidth < 768;
      const el = isMobile
        ? document.getElementById("dashboard-header-actions-mobile")
        : document.getElementById("dashboard-header-actions-desktop");
      setTarget(el || document.getElementById("dashboard-header-actions"));
    }

    updateTarget();
    window.addEventListener("resize", updateTarget);
    return () => window.removeEventListener("resize", updateTarget);
  }, []);

  if (!target) return null;

  return createPortal(children, target);
}
