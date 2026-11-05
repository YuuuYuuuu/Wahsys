import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  HandCoins,
  Shield,
  Users,
  ScrollText,
  Mail,
  Clock,
  ClipboardList,
  Presentation,
  Search,
  FileQuestion,
  Archive,
  CheckCheck,
  Handshake,
  BarChart3,
  Boxes,
  TrendingUp,
  Settings2,
  Sparkles,
} from "lucide-react";
import { OrgRole, Role } from "@prisma/client";
import type { AuthUser } from "@/stores/auth-store";

export type DashboardNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: Role[];
  /** Jika true, tampil untuk ADMIN atau user dengan orgRole */
  requireOrg?: boolean;
  /** Jika diisi, tampil untuk ADMIN atau orgRole yang cocok */
  orgRoles?: OrgRole[];
};

export type DashboardNavGroup = {
  label: string;
  icon?: LucideIcon;
  links: DashboardNavLink[];
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    label: "Utama",
    icon: LayoutDashboard,
    links: [{ href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard }],
  },
  {
    label: "Operasional",
    icon: Boxes,
    links: [
      { href: "/dashboard/inventory", label: "Inventory", icon: Package },
      { href: "/dashboard/loans", label: "Peminjaman", icon: HandCoins },
      { href: "/dashboard/lembur", label: "Lembur", icon: Clock },
    ],
  },
  {
    label: "Lost & Found",
    icon: Search,
    links: [
      { href: "/dashboard/lost-found", label: "Ikhtisar", icon: Sparkles },
      { href: "/dashboard/lost-found/lost", label: "Laporan Hilang", icon: FileQuestion },
      { href: "/dashboard/lost-found/found", label: "Barang Temuan", icon: Archive },
      { href: "/dashboard/lost-found/claims", label: "Klaim", icon: CheckCheck },
      { href: "/dashboard/lost-found/handovers", label: "Serah Terima", icon: Handshake },
      { href: "/dashboard/lost-found/reports", label: "Laporan & Statistik", icon: BarChart3, roles: [Role.ADMIN, Role.PETUGAS] },
    ],
  },
  {
    label: "Kinerja",
    icon: TrendingUp,
    links: [
      { href: "/dashboard/kinerja", label: "Laporan", icon: ClipboardList, requireOrg: true },
      {
        href: "/dashboard/kinerja/meeting",
        label: "Ringkasan Meeting",
        icon: Presentation,
        orgRoles: [OrgRole.KEPALA_SEKSI],
      },
    ],
  },
  {
    label: "Administrasi",
    icon: Settings2,
    links: [
      { href: "/dashboard/vault", label: "Vault", icon: Shield, roles: [Role.ADMIN] },
      { href: "/dashboard/pengaturan-email", label: "Email & SMTP", icon: Mail, roles: [Role.ADMIN] },
      { href: "/dashboard/users", label: "Pengguna", icon: Users, roles: [Role.ADMIN] },
      { href: "/dashboard/audit", label: "Audit", icon: ScrollText, roles: [Role.ADMIN] },
    ],
  },
];

/** Flat list (kompatibilitas command palette & pencarian). */
export const dashboardNavLinks: DashboardNavLink[] = dashboardNavGroups.flatMap((g) => g.links);

export function canSeeNavLink(link: DashboardNavLink, user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (link.roles && !link.roles.includes(user.role)) return false;
  if (link.requireOrg) {
    return user.role === Role.ADMIN || Boolean(user.orgRole);
  }
  if (link.orgRoles) {
    return user.role === Role.ADMIN || (user.orgRole != null && link.orgRoles.includes(user.orgRole));
  }
  return true;
}

export function getVisibleNavGroups(user: AuthUser | null | undefined): DashboardNavGroup[] {
  return dashboardNavGroups
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => canSeeNavLink(link, user)),
    }))
    .filter((group) => group.links.length > 0);
}

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/lost-found") return pathname === "/dashboard/lost-found";
  if (href === "/dashboard/kinerja") {
    return pathname === "/dashboard/kinerja" || /^\/dashboard\/kinerja\/[^/]+$/.test(pathname);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isGroupActive(group: DashboardNavGroup, pathname: string): boolean {
  return group.links.some((l) => isNavLinkActive(pathname, l.href));
}
