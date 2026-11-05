import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";

function clientMeta(req?: NextRequest | Request) {
  if (!req) return { ipAddress: null as string | null, userAgent: null as string | null };
  const headers = req.headers;
  const forwarded = headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? headers.get("x-real-ip") ?? null;
  return { ipAddress: ip, userAgent: headers.get("user-agent") };
}

export async function logAudit(
  userId: string,
  action: string,
  resource: string,
  options?: {
    metadata?: Prisma.InputJsonValue;
    req?: NextRequest | Request;
  }
) {
  const { ipAddress, userAgent } = clientMeta(options?.req);
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource,
      metadata: options?.metadata ?? undefined,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    },
  });
}
