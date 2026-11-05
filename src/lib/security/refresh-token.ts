import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";

const PEPPER = () => {
  const p = process.env.REFRESH_PEPPER;
  if (!p || p.length < 16) throw new Error("REFRESH_PEPPER must be set (min 16 chars)");
  return p;
};

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw + PEPPER()).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export async function storeRefreshToken(userId: string, raw: string, days?: number) {
  const d = days ?? Number(process.env.REFRESH_TOKEN_DAYS ?? 7);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + d);
  const tokenHash = hashRefreshToken(raw);
  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return expiresAt;
}

export async function rotateRefreshToken(
  oldRaw: string,
  userId: string
): Promise<{ newRaw: string; expiresAt: Date } | null> {
  const oldHash = hashRefreshToken(oldRaw);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: oldHash },
  });
  if (!existing || existing.userId !== userId) return null;
  if (existing.revokedAt || existing.expiresAt < new Date()) return null;

  const newRaw = generateRefreshToken();
  const d = Number(process.env.REFRESH_TOKEN_DAYS ?? 7);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + d);
  const newHash = hashRefreshToken(newRaw);

  await prisma.$transaction(async (tx) => {
    const created = await tx.refreshToken.create({
      data: { userId, tokenHash: newHash, expiresAt },
    });
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: created.id },
    });
  });

  return { newRaw, expiresAt };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashRefreshToken(raw);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
