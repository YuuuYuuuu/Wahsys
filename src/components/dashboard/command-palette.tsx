"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { getVisibleNavGroups } from "@/config/dashboard-nav-links";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Package, Search } from "lucide-react";

type ItemHit = { id: string; name: string; assetCode: string | null };

export function CommandPalette() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [items, setItems] = useState<ItemHit[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const visibleGroups = useMemo(() => getVisibleNavGroups(user), [user]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    if (debounced.length < 2) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoadingItems(true);
    void (async () => {
      try {
        const params = new URLSearchParams({ page: "1", limit: "8", q: debounced });
        const res = await apiFetch(`/api/items?${params.toString()}`);
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { items: ItemHit[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const qLower = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!qLower) return visibleGroups;
    return visibleGroups
      .map((g) => ({
        ...g,
        links: g.links.filter(
          (l) => l.label.toLowerCase().includes(qLower) || l.href.toLowerCase().includes(qLower)
        ),
      }))
      .filter((g) => g.links.length > 0);
  }, [visibleGroups, qLower]);

  const firstNavHref = filteredGroups[0]?.links[0]?.href;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-lg"
      >
        <DialogTitle className="sr-only">Pencarian cepat</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border/80 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Input
            autoFocus
            placeholder="Cari menu atau barang (min. 2 huruf)…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && firstNavHref && !debounced) {
                e.preventDefault();
                setOpen(false);
                router.push(firstNavHref);
              }
            }}
          />
        </div>
        <div className="max-h-[min(60vh,22rem)] overflow-auto p-2 text-sm">
          {filteredGroups.length === 0 ? (
            <p className="px-2 py-2 text-muted-foreground">Tidak ada menu cocok.</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.links.map((l) => {
                    const Icon = l.icon;
                    return (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/80"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                          {l.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
          {(debounced.length >= 2 || loadingItems) && (
            <>
              <p className="mt-3 px-2 pb-1 text-xs font-medium text-muted-foreground">Barang</p>
              <ul className="space-y-0.5">
                {loadingItems && <li className="px-2 py-2 text-muted-foreground">Memuat…</li>}
                {!loadingItems &&
                  items.map((it) => (
                    <li key={it.id}>
                      <Link
                        href={`/dashboard/inventory/${it.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/80"
                      >
                        <Package className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        <span className="min-w-0 truncate">
                          {it.name}
                          {it.assetCode ? (
                            <span className="ml-1 text-xs text-muted-foreground">({it.assetCode})</span>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  ))}
                {!loadingItems && debounced.length >= 2 && items.length === 0 && (
                  <li className="px-2 py-2 text-muted-foreground">Tidak ada barang cocok.</li>
                )}
              </ul>
            </>
          )}
        </div>
        <div className="border-t border-border/80 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">⌘</kbd>
          <kbd className="ml-0.5 rounded border border-border bg-background px-1 py-0.5 font-mono">K</kbd>
          <span className="ml-2">buka / tutup</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
