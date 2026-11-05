import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import { signAccessToken } from "@/lib/security/jwt";
import {
  generateRefreshToken,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  hashRefreshToken,
} from "@/lib/security/refresh-token";
import { logAudit } from "@/lib/audit/audit";
import { OrgRole, Role, StaffUnit } from "@prisma/client";

export type AuthUserDto = {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgRole: OrgRole | null;
  unit: StaffUnit | null;
  supervisorId: string | null;
};

function toAuthUserDto(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgRole: OrgRole | null;
  unit: StaffUnit | null;
  supervisorId: string | null;
}): AuthUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    orgRole: user.orgRole,
    unit: user.unit,
    supervisorId: user.supervisorId,
  };
}

export async function registerUser(
  data: { name: string; email: string; password: string },
  req: Request
) {
  const userCount = await prisma.user.count();
  const allowPublic = process.env.ALLOW_PUBLIC_REGISTER !== "false";
  if (!allowPublic && userCount > 0) {
    throw new Error("Registration is disabled");
  }

  const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (exists) throw new Error("Email already registered");

  const password = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      password,
      role: Role.PETUGAS,
      accountApproved: false,
    },
  });

  await logAudit(user.id, "USER_REGISTER", `user:${user.id}`, { req });

  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function loginUser(
  email: string,
  password: string,
  req: Request
): Promise<
  | {
      user: AuthUserDto;
      accessToken: string;
      refreshToken: string;
      refreshExpiresAt: Date;
    }
  | { failed: true }
  | { pendingApproval: true }
> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return { failed: true };
  }
  const ok = await verifyPassword(password, user.password);
  if (!ok) {
    await logAudit(user.id, "LOGIN_FAILED", `user:${user.id}`, {
      req,
      metadata: { reason: "bad_password" },
    });
    return { failed: true };
  }

  if (!user.accountApproved) {
    await logAudit(user.id, "LOGIN_FAILED", `user:${user.id}`, {
      req,
      metadata: { reason: "pending_approval" },
    });
    return { pendingApproval: true };
  }

  await logAudit(user.id, "LOGIN_SUCCESS", `user:${user.id}`, { req });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const rawRefresh = generateRefreshToken();
  const expiresAt = await storeRefreshToken(user.id, rawRefresh);

  return {
    user: toAuthUserDto(user),
    accessToken,
    refreshToken: rawRefresh,
    refreshExpiresAt: expiresAt,
  };
}

export async function refreshSession(oldRefresh: string) {
  const tokenHash = hashRefreshToken(oldRefresh);
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!row || row.revokedAt || row.expiresAt < new Date()) return null;

  const rotated = await rotateRefreshToken(oldRefresh, row.userId);
  if (!rotated) return null;

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user || !user.accountApproved) return null;

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken,
    refreshToken: rotated.newRaw,
    refreshExpiresAt: rotated.expiresAt,
    user: toAuthUserDto(user),
  };
}

export async function logoutUser(refreshRaw: string | undefined) {
  if (refreshRaw) await revokeRefreshToken(refreshRaw);
}
