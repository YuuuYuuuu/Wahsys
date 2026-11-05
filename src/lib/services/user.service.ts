import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";
import { revokeAllUserRefreshTokens } from "@/lib/security/refresh-token";
import { logAudit } from "@/lib/audit/audit";
import { OrgRole, Role, StaffUnit } from "@prisma/client";

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  orgRole: true,
  unit: true,
  supervisorId: true,
  accountApproved: true,
  createdAt: true,
  supervisor: { select: { id: true, name: true, email: true } },
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    select: userListSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function listUsersPaginated(
  page: number,
  pageSize: number = 20,
  opts?: { pendingOnly?: boolean }
) {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const where = opts?.pendingOnly ? { accountApproved: false } : {};
  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = await prisma.user.findMany({
    where,
    select: userListSelect,
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  });
  return { items, total, page: safePage, pageSize: safeSize, totalPages };
}

export async function listKepalaSeksi() {
  return prisma.user.findMany({
    where: { orgRole: OrgRole.KEPALA_SEKSI, accountApproved: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function updateUserOrg(
  actorId: string,
  targetId: string,
  data: { orgRole: OrgRole | null; unit: StaffUnit | null; supervisorId: string | null },
  req: Request
) {
  if (data.orgRole === OrgRole.STAFF && data.supervisorId) {
    if (data.supervisorId === targetId) {
      throw new Error("Tidak dapat menunjuk diri sendiri sebagai supervisor");
    }
    const supervisor = await prisma.user.findUnique({
      where: { id: data.supervisorId },
      select: { id: true, orgRole: true },
    });
    if (!supervisor || supervisor.orgRole !== OrgRole.KEPALA_SEKSI) {
      throw new Error("Supervisor harus pengguna dengan peran Kepala Seksi");
    }
  }

  const unit = data.orgRole === OrgRole.STAFF ? data.unit : null;
  const supervisorId = data.orgRole === OrgRole.STAFF ? data.supervisorId : null;

  const user = await prisma.user.update({
    where: { id: targetId },
    data: {
      orgRole: data.orgRole,
      unit,
      supervisorId,
    },
    select: userListSelect,
  });

  await logAudit(actorId, "USER_ORG_UPDATE", `user:${targetId}`, {
    req,
    metadata: { orgRole: data.orgRole, unit, supervisorId },
  });
  return user;
}

export async function updateUserRole(
  actorId: string,
  targetId: string,
  role: Role,
  req: Request
) {
  if (actorId === targetId && role !== Role.ADMIN) {
    /* allow demoting self? block for safety */
  }
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  await revokeAllUserRefreshTokens(targetId);
  await logAudit(actorId, "USER_ROLE_UPDATE", `user:${targetId}`, {
    req,
    metadata: { newRole: role },
  });
  return user;
}

export async function adminCreateUser(
  actorId: string,
  data: { name: string; email: string; password: string; role?: Role },
  req: Request
) {
  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw new Error("Email already registered");
  const password = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      password,
      role: data.role ?? Role.PETUGAS,
      accountApproved: true,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  await logAudit(actorId, "USER_CREATE", `user:${user.id}`, { req });
  return user;
}

export async function approveUser(actorId: string, targetId: string, req: Request) {
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { accountApproved: true },
    select: { id: true, name: true, email: true, role: true, accountApproved: true, createdAt: true },
  });
  await logAudit(actorId, "USER_APPROVE", `user:${targetId}`, { req });
  return user;
}
