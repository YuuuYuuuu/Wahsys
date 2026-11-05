"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Menu, ChevronRight, Layers, LayoutDashboard, Package, HandCoins, Sparkles, X, LogOut } from "lucide-react";
import { getVisibleNavGroups, isNavLinkActive, isGroupActive } from "@/config/dashboard-nav-links";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { AppLogo } from "@/components/ui/app-logo";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clear();
    router.push("/login");
  }

  const navGroups = getVisibleNavGroups(user);

  const pageTitle = (() => {
    const clean = pathname.replace(/^\/dashboard\/?/, "");
    if (!clean) return "Ringkasan";
    const [section, sub] = clean.split("/");
    const labels: Record<string, string> = {
      inventory: "Inventory",
      loans: "Peminjaman",
      lembur: "Lembur",
      kinerja: "Kinerja",
      "lost-found": "Lost & Found",
      vault: "Vault",
      "pengaturan-email": "Email & SMTP",
      users: "Pengguna",
      audit: "Audit",
    };
    const main = labels[section] || section;
    if (section === "lost-found") {
      if (!sub) return "Lost & Found";
      if (sub === "lost") return "Lost & Found / Laporan Hilang";
      if (sub === "found") return "Lost & Found / Barang Temuan";
      if (sub === "claims") return "Lost & Found / Klaim";
      if (sub === "handovers") return "Lost & Found / Serah Terima";
      if (sub === "reports") return "Lost & Found / Laporan & Statistik";
      return `Lost & Found / ${sub}`;
    }
    if (section === "kinerja" && sub === "meeting") return "Kinerja / Ringkasan Meeting";
    if (section === "inventory" && sub) return "Inventory / Detail Item";
    if (section === "kinerja" && sub) return "Kinerja / Detail Laporan";
    return sub ? `${main} / Detail` : main;
  })();

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    // State dropdown per grup kategori
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
      const initial: Record<string, boolean> = {};
      navGroups.forEach((g) => {
        // Otomatis buka jika halaman aktif berada di dalam kategori ini
        initial[g.label] = isGroupActive(g, pathname);
      });
      return initial;
    });

    // Otomatis buka dropdown saat pengguna berpindah ke halaman di dalam kategori tersebut
    useEffect(() => {
      navGroups.forEach((g) => {
        if (isGroupActive(g, pathname)) {
          setOpenGroups((prev) => ({ ...prev, [g.label]: true }));
        }
      });
    }, [pathname]);

    function toggleGroup(label: string) {
      setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
    }

    return (
      <div className="flex flex-col gap-1">
        {navGroups.map((group) => {
          // Jika kategori hanya 1 link (seperti Utama -> Ringkasan), tampilkan sebagai link mandiri yang bersih
          if (group.links.length === 1 && group.label === "Utama") {
            const singleLink = group.links[0];
            const Icon = singleLink.icon;
            const isActive = isNavLinkActive(pathname, singleLink.href);

            return (
              <div key={group.label} className="mb-1">
                <Link
                  href={singleLink.href}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/80",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold shadow-2xs"
                      : "text-foreground/90 hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span>{singleLink.label}</span>
                </Link>
              </div>
            );
          }

          // Kategori dropdown (Operasional, Lost & Found, Kinerja, Administrasi)
          const isOpen = Boolean(openGroups[group.label]);
          const groupActive = isGroupActive(group, pathname);
          const GroupIcon = group.icon || Layers;

          return (
            <div key={group.label} className="rounded-lg transition-colors">
              {/* Header Dropdown Kategori */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all select-none text-left",
                  groupActive
                    ? "text-primary bg-primary/5 hover:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <GroupIcon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      groupActive ? "text-primary" : "text-muted-foreground/80"
                    )}
                  />
                  <span className="truncate uppercase text-[11px] font-bold tracking-wider">
                    {group.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Indikator dot aktif saat dropdown sedang tertutup */}
                  {groupActive && !isOpen && (
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isOpen ? "rotate-90 text-primary font-bold" : "text-muted-foreground/70"
                    )}
                  />
                </div>
              </button>

              {/* Sub-menu Link di dalam Dropdown (Animasi Grid Accordion) */}
              <div
                className={cn(
                  "grid transition-all duration-200 ease-in-out",
                  isOpen ? "grid-rows-[1fr] opacity-100 my-0.5" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-4 pl-2.5 border-l border-border/70 flex flex-col gap-0.5 py-1">
                    {group.links.map((l) => {
                      const Icon = l.icon;
                      const isActive = isNavLinkActive(pathname, l.href);

                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => onNavigate?.()}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-semibold shadow-2xs"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground/70"
                            )}
                          />
                          <span className="truncate">{l.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-dvh min-h-0 bg-background">
      <CommandPalette />
      <aside className="relative hidden min-h-0 w-60 shrink-0 flex-col border-r border-border/80 bg-gradient-to-b from-card via-card to-primary/[0.04] md:flex">
        <div className="flex h-14 items-center border-b border-border/80 bg-primary/5 px-4">
          <AppLogo size="sm" href="/dashboard" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          <NavLinks />
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border/80 p-4">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            Keluar
          </Button>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/60 px-3 sm:px-4 md:px-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-2 md:hidden">
              <span className="truncate text-base font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display), serif" }}>
                {pageTitle}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display), serif" }}>
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            {/* Desktop Actions Container */}
            <div id="dashboard-header-actions-desktop" className="hidden md:flex items-center gap-2" />
            <div id="dashboard-header-actions" className="hidden md:flex items-center gap-2" />

            <div className="flex items-center gap-2 sm:border-l sm:border-border/60 sm:pl-2.5">
              <span className="hidden text-xs text-muted-foreground lg:inline max-w-[120px] truncate">{user?.name || user?.email}</span>
              <span className="rounded-full border border-border/80 bg-muted/60 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Sub-Header Action Toolbar: Satu baris rapi yang bisa di-swipe secara horizontal tanpa menumpuk header */}
        <div
          id="dashboard-header-actions-mobile"
          className="md:hidden shrink-0 border-b border-border/60 bg-card/90 backdrop-blur-md px-3 py-2 overflow-x-auto no-scrollbar empty:hidden [&>*]:flex-nowrap [&>*]:whitespace-nowrap [&_*]:shrink-0 flex items-center gap-2"
        ></div>

        {/* Drawer Menu Navigasi Lengkap untuk Mobile */}
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent
            aria-describedby={undefined}
            className={cn(
              "fixed left-0 top-0 z-50 flex h-dvh max-h-none w-[min(19rem,88vw)] max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-l-0 border-r border-border/80 bg-gradient-to-b from-card via-card to-primary/[0.04] p-0 shadow-2xl sm:rounded-none"
            )}
          >
            <DialogTitle className="sr-only">Menu navigasi</DialogTitle>
            
            {/* Header Drawer */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-primary/5 px-4">
              <AppLogo size="sm" href="/dashboard" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileNavOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Tutup menu</span>
              </Button>
            </div>

            {/* Profil Singkat Pengguna */}
            <div className="border-b border-border/70 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xs shadow-2xs">
                  {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user?.name || user?.email}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                      {user?.role}
                    </span>
                    {user?.orgRole && (
                      <span className="rounded-full bg-muted text-muted-foreground px-1.5 py-0.5 text-[9px]">
                        {user.orgRole.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar Navigasi Berkelompok */}
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pb-6">
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </nav>

            {/* Footer Drawer */}
            <div className="mt-auto flex flex-col gap-2 border-t border-border/80 p-4 bg-card/80">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                onClick={() => {
                  setMobileNavOpen(false);
                  void logout();
                }}
              >
                <LogOut className="h-3.5 w-3.5" />
                Keluar dari Akun
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Kontainer Halaman Utama dengan ruang bawah untuk Bottom Navbar */}
        <div className="flex min-h-0 flex-1 overflow-auto bg-background p-3 pb-24 sm:p-4 md:p-6 md:pb-6">
          <div className="w-full max-w-full">{children}</div>
        </div>

        {/* Mobile Bottom Navigation Bar (Muncul hanya di perangkat mobile < md) */}
        <nav
          aria-label="Navigasi Bawah Mobile"
          className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t border-border/80 bg-card/95 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        >
          <div className="mx-auto grid grid-cols-5 h-16 items-center px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
            {/* 1. Ringkasan */}
            <Link
              href="/dashboard"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center select-none transition-all duration-150 active:scale-95",
                pathname === "/dashboard"
                  ? "text-primary font-semibold"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              <div className="relative">
                <LayoutDashboard
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    pathname === "/dashboard" ? "scale-110 text-primary" : "text-muted-foreground/80"
                  )}
                />
                {pathname === "/dashboard" && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-[62px]">
                Ringkasan
              </span>
            </Link>

            {/* 2. Inventory */}
            <Link
              href="/dashboard/inventory"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center select-none transition-all duration-150 active:scale-95",
                pathname.startsWith("/dashboard/inventory")
                  ? "text-primary font-semibold"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              <div className="relative">
                <Package
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    pathname.startsWith("/dashboard/inventory") ? "scale-110 text-primary" : "text-muted-foreground/80"
                  )}
                />
                {pathname.startsWith("/dashboard/inventory") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-[62px]">
                Inventory
              </span>
            </Link>

            {/* 3. Peminjaman */}
            <Link
              href="/dashboard/loans"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center select-none transition-all duration-150 active:scale-95",
                pathname.startsWith("/dashboard/loans")
                  ? "text-primary font-semibold"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              <div className="relative">
                <HandCoins
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    pathname.startsWith("/dashboard/loans") ? "scale-110 text-primary" : "text-muted-foreground/80"
                  )}
                />
                {pathname.startsWith("/dashboard/loans") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-[62px]">
                Pinjam
              </span>
            </Link>

            {/* 4. Lost & Found */}
            <Link
              href="/dashboard/lost-found"
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center select-none transition-all duration-150 active:scale-95",
                pathname.startsWith("/dashboard/lost-found")
                  ? "text-primary font-semibold"
                  : "text-muted-foreground/80 hover:text-foreground"
              )}
            >
              <div className="relative">
                <Sparkles
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    pathname.startsWith("/dashboard/lost-found") ? "scale-110 text-primary" : "text-muted-foreground/80"
                  )}
                />
                {pathname.startsWith("/dashboard/lost-found") && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3.5 rounded-full bg-primary" />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight truncate max-w-[62px]">
                Lost & Found
              </span>
            </Link>

            {/* 5. Menu / Lainnya */}
            {(() => {
              const isMainTab =
                pathname === "/dashboard" ||
                pathname.startsWith("/dashboard/inventory") ||
                pathname.startsWith("/dashboard/loans") ||
                pathname.startsWith("/dashboard/lost-found");
              const isMenuTabActive = mobileNavOpen || !isMainTab;

              return (
                <button
                  type="button"
                  onClick={() => setMobileNavOpen((prev) => !prev)}
                  className={cn(
                    "relative flex flex-col items-center justify-center gap-1 h-full py-1 text-center select-none transition-all duration-150 active:scale-95",
                    isMenuTabActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground/80 hover:text-foreground"
                  )}
                  aria-label="Buka semua menu navigasi"
                  aria-expanded={mobileNavOpen}
                >
                  <div className="relative">
                    <Menu
                      className={cn(
                        "h-5 w-5 transition-transform duration-200",
                        isMenuTabActive ? "scale-110 text-primary" : "text-muted-foreground/80"
                      )}
                    />
                    {isMenuTabActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-3.5 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-[10px] leading-tight tracking-tight truncate max-w-[62px]">
                    Menu
                  </span>
                </button>
              );
            })()}
          </div>
        </nav>
      </div>
    </div>
  );
}
