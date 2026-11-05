"use client";

import { useCallback, useId, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  /** Hint shown while content is obscured */
  hint?: string;
  className?: string;
};

/**
 * Content stays blurred until the user presses and holds the control.
 * Reduces casual shoulder-surfing / quick screenshots; not a cryptographic guarantee.
 */
export function HoldToReveal({ children, hint, className }: Props) {
  const [active, setActive] = useState(false);
  const labelId = useId();

  const end = useCallback(() => setActive(false), []);

  return (
    <div
      className={cn(
        "vault-sensitive overflow-hidden rounded-lg border bg-muted/20 print:hidden",
        className,
      )}
    >
      <div className="relative min-h-[5.5rem]">
        <div
          className={cn(
            "max-h-[min(82vh,920px)] overflow-auto p-4 transition duration-150",
            active ? "blur-0" : "blur-md select-none",
          )}
          aria-hidden={!active}
        >
          {children}
        </div>
        {!active && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/85 p-4 sm:p-6"
            aria-hidden
          >
            <p
              id={labelId}
              className="max-w-lg text-pretty text-center text-sm leading-relaxed text-muted-foreground"
            >
              {hint ??
                "Tahan tombol di bawah untuk melihat. Konten disembunyikan agar mengurangi risiko tangkapan layar santai."}
            </p>
          </div>
        )}
      </div>
      <div className="border-t bg-muted/40 p-2">
        <button
          type="button"
          className="w-full rounded-md bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation hover:bg-primary/90 active:bg-primary/80"
          onPointerDown={() => setActive(true)}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          aria-pressed={active}
          aria-describedby={labelId}
        >
          {active ? "Lepaskan untuk menyembunyikan" : "Tahan untuk melihat"}
        </button>
      </div>
    </div>
  );
}
