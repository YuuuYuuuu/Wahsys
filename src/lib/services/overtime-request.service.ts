import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import { OvertimeRequestStatus, Role } from "@prisma/client";
import type { OvertimeFormSnapshotInput } from "@/lib/validators/overtime-request";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE_DEFAULT = 20;

export async function createOvertimeRequest(
  userId: string,
  formSnapshot: OvertimeFormSnapshotInput,
  asDraft: boolean,
  req: Request
) {
  const status = asDraft ? OvertimeRequestStatus.DRAFT : OvertimeRequestStatus.MENUNGGU;
  const row = await prisma.overtimeRequest.create({
    data: {
      userId,
      status,
      formSnapshot: formSnapshot as Prisma.InputJsonValue,
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await logAudit(userId, "OVERTIME_REQUEST_CREATE", `overtimeRequest:${row.id}`, {
    req,
    metadata: { status },
  });
  return row;
}

export async function listOvertimeRequests(
  viewerId: string,
  viewerRole: Role,
  page: number,
  limit: number,
  status?: OvertimeRequestStatus
) {
  const safeLimit = Math.min(50, Math.max(1, limit));
  const where: Prisma.OvertimeRequestWhereInput =
    viewerRole === Role.ADMIN
      ? status
        ? { status }
        : {}
      : {
          userId: viewerId,
          ...(status ? { status } : {}),
        };

  const total = await prisma.overtimeRequest.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * safeLimit;

  const items = await prisma.overtimeRequest.findMany({
    where,
    skip,
    take: safeLimit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { items, total, page: safePage, pageSize: safeLimit, totalPages };
}

export async function getOvertimeRequest(id: string, viewerId: string, viewerRole: Role) {
  const row = await prisma.overtimeRequest.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!row) return null;
  if (viewerRole !== Role.ADMIN && row.userId !== viewerId) return null;
  return row;
}

export async function updateOvertimeRequestDraft(
  id: string,
  userId: string,
  formSnapshot: OvertimeFormSnapshotInput,
  req: Request
) {
  const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Overtime request not found");
  if (existing.userId !== userId) throw new Error("Forbidden overtime request");
  if (existing.status !== OvertimeRequestStatus.DRAFT) throw new Error("Overtime request is not editable");

  const row = await prisma.overtimeRequest.update({
    where: { id },
    data: { formSnapshot: formSnapshot as Prisma.InputJsonValue },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await logAudit(userId, "OVERTIME_REQUEST_UPDATE", `overtimeRequest:${id}`, { req });
  return row;
}

export async function submitOvertimeRequest(id: string, userId: string, req: Request) {
  const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Overtime request not found");
  if (existing.userId !== userId) throw new Error("Forbidden overtime request");
  if (existing.status !== OvertimeRequestStatus.DRAFT) throw new Error("Overtime request cannot be submitted");

  const row = await prisma.overtimeRequest.update({
    where: { id },
    data: { status: OvertimeRequestStatus.MENUNGGU },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  await logAudit(userId, "OVERTIME_REQUEST_SUBMIT", `overtimeRequest:${id}`, { req });
  return row;
}

export async function reviewOvertimeRequest(
  id: string,
  adminId: string,
  action: "approve" | "reject",
  req: Request
) {
  const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Overtime request not found");
  if (existing.status !== OvertimeRequestStatus.MENUNGGU) {
    throw new Error("Overtime request is not awaiting review");
  }

  const status =
    action === "approve" ? OvertimeRequestStatus.DISETUJUI : OvertimeRequestStatus.DITOLAK;

  const row = await prisma.overtimeRequest.update({
    where: { id },
    data: {
      status,
      decidedAt: new Date(),
      decidedById: adminId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      decidedBy: { select: { id: true, name: true, email: true } },
    },
  });

  await logAudit(adminId, action === "approve" ? "OVERTIME_REQUEST_APPROVE" : "OVERTIME_REQUEST_REJECT", `overtimeRequest:${id}`, {
    req,
    metadata: { targetUserId: existing.userId },
  });
  return row;
}

export async function deleteOvertimeRequestDraft(id: string, userId: string, req: Request) {
  const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Overtime request not found");
  if (existing.userId !== userId) throw new Error("Forbidden overtime request");
  if (existing.status !== OvertimeRequestStatus.DRAFT) throw new Error("Overtime request is not deletable");

  await prisma.overtimeRequest.delete({ where: { id } });
  await logAudit(userId, "OVERTIME_REQUEST_DELETE", `overtimeRequest:${id}`, { req });
}

export { PAGE_SIZE_DEFAULT };
