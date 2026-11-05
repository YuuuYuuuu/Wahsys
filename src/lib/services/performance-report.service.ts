import {
  OrgRole,
  PerformancePeriodType,
  PerformanceReportStatus,
  Prisma,
  Role,
  StaffUnit,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { logAudit } from "@/lib/audit/audit";
import { AuthError } from "@/lib/http";

const authorSelect = {
  id: true,
  name: true,
  email: true,
  orgRole: true,
  unit: true,
  supervisorId: true,
} as const;

const reportInclude = {
  author: { select: authorSelect },
  reviewedBy: { select: { id: true, name: true, email: true } },
} as const;

type Actor = {
  id: string;
  role: Role;
  orgRole: OrgRole | null;
};

async function loadActor(userId: string): Promise<Actor> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, orgRole: true },
  });
  if (!user) throw new AuthError("Unauthorized", 401);
  return user;
}

async function visibleAuthorIds(actor: Actor): Promise<string[] | "all"> {
  if (actor.role === Role.ADMIN) return "all";
  if (actor.orgRole === OrgRole.KEPALA_SEKSI) {
    const reports = await prisma.user.findMany({
      where: { supervisorId: actor.id },
      select: { id: true },
    });
    return [actor.id, ...reports.map((r) => r.id)];
  }
  if (actor.orgRole === OrgRole.STAFF) {
    return [actor.id];
  }
  throw new AuthError("Forbidden", 403);
}

function ensureCanAccessOrgModule(actor: Actor) {
  if (actor.role === Role.ADMIN) return;
  if (actor.orgRole === OrgRole.KEPALA_SEKSI || actor.orgRole === OrgRole.STAFF) return;
  throw new AuthError("Forbidden", 403);
}

export async function listPerformanceReports(
  actorId: string,
  query: {
    page: number;
    limit: number;
    status?: PerformanceReportStatus;
    unit?: StaffUnit;
    authorId?: string;
    from?: string;
    to?: string;
  }
) {
  const actor = await loadActor(actorId);
  ensureCanAccessOrgModule(actor);
  const scope = await visibleAuthorIds(actor);

  const where: Prisma.PerformanceReportWhereInput = {};
  if (scope !== "all") {
    where.authorId = { in: scope };
  }
  if (query.authorId) {
    if (scope !== "all" && !scope.includes(query.authorId)) {
      throw new AuthError("Forbidden", 403);
    }
    where.authorId = query.authorId;
  }
  if (query.status) where.status = query.status;
  if (query.unit) where.author = { unit: query.unit };
  if (query.from || query.to) {
    where.periodStart = {};
    if (query.from) where.periodStart.gte = new Date(`${query.from}T00:00:00.000Z`);
    if (query.to) where.periodStart.lte = new Date(`${query.to}T00:00:00.000Z`);
  }

  const total = await prisma.performanceReport.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const safePage = Math.min(Math.max(1, query.page), totalPages);

  const items = await prisma.performanceReport.findMany({
    where,
    include: reportInclude,
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * query.limit,
    take: query.limit,
  });

  return {
    items,
    total,
    page: safePage,
    limit: query.limit,
    pageSize: query.limit,
    totalPages,
  };
}

export async function getPerformanceReport(actorId: string, id: string) {
  const actor = await loadActor(actorId);
  ensureCanAccessOrgModule(actor);
  const row = await prisma.performanceReport.findUnique({
    where: { id },
    include: reportInclude,
  });
  if (!row) return null;

  const scope = await visibleAuthorIds(actor);
  if (scope !== "all" && !scope.includes(row.authorId)) {
    throw new AuthError("Forbidden", 403);
  }
  return row;
}

export async function createPerformanceReport(
  actorId: string,
  data: {
    periodType: PerformancePeriodType;
    periodStart: Date;
    periodEnd: Date;
    activities: string;
    blockers?: string | null;
    notes?: string | null;
    submit?: boolean;
  },
  req: Request
) {
  const actor = await loadActor(actorId);
  if (actor.role !== Role.ADMIN && actor.orgRole !== OrgRole.STAFF && actor.orgRole !== OrgRole.KEPALA_SEKSI) {
    throw new AuthError("Forbidden", 403);
  }

  const status = data.submit ? PerformanceReportStatus.SUBMITTED : PerformanceReportStatus.DRAFT;

  try {
    const row = await prisma.performanceReport.create({
      data: {
        authorId: actorId,
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        activities: data.activities,
        blockers: data.blockers ?? null,
        notes: data.notes ?? null,
        status,
      },
      include: reportInclude,
    });
    await logAudit(actorId, data.submit ? "PERFORMANCE_REPORT_SUBMIT" : "PERFORMANCE_REPORT_CREATE", `performanceReport:${row.id}`, {
      req,
    });
    return row;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Laporan untuk periode ini sudah ada");
    }
    throw e;
  }
}

export async function updatePerformanceReport(
  actorId: string,
  id: string,
  data: {
    periodType?: PerformancePeriodType;
    periodStart?: Date;
    periodEnd?: Date;
    activities?: string;
    blockers?: string | null;
    notes?: string | null;
  },
  req: Request
) {
  const actor = await loadActor(actorId);
  const existing = await prisma.performanceReport.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.authorId !== actorId) throw new AuthError("Forbidden", 403);
  if (existing.status !== PerformanceReportStatus.DRAFT) {
    throw new Error("Hanya laporan draf yang dapat diubah");
  }

  const periodStart = data.periodStart ?? existing.periodStart;
  const periodEnd = data.periodEnd ?? existing.periodEnd;
  if (periodEnd < periodStart) {
    throw new Error("Tanggal akhir tidak boleh sebelum tanggal mulai");
  }

  try {
    const row = await prisma.performanceReport.update({
      where: { id },
      data: {
        periodType: data.periodType,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        activities: data.activities,
        blockers: data.blockers === undefined ? undefined : data.blockers,
        notes: data.notes === undefined ? undefined : data.notes,
      },
      include: reportInclude,
    });
    await logAudit(actorId, "PERFORMANCE_REPORT_UPDATE", `performanceReport:${id}`, { req });
    return row;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("Laporan untuk periode ini sudah ada");
    }
    throw e;
  }
}

export async function submitPerformanceReport(actorId: string, id: string, req: Request) {
  const existing = await prisma.performanceReport.findUnique({ where: { id } });
  if (!existing) return null;
  if (existing.authorId !== actorId) throw new AuthError("Forbidden", 403);
  if (existing.status !== PerformanceReportStatus.DRAFT) {
    throw new Error("Hanya laporan draf yang dapat diajukan");
  }

  const row = await prisma.performanceReport.update({
    where: { id },
    data: { status: PerformanceReportStatus.SUBMITTED },
    include: reportInclude,
  });
  await logAudit(actorId, "PERFORMANCE_REPORT_SUBMIT", `performanceReport:${id}`, { req });
  return row;
}

export async function reviewPerformanceReport(
  actorId: string,
  id: string,
  reviewerNote: string | null | undefined,
  req: Request
) {
  const actor = await loadActor(actorId);
  const existing = await prisma.performanceReport.findUnique({
    where: { id },
    include: { author: { select: { supervisorId: true } } },
  });
  if (!existing) return null;

  const isAdmin = actor.role === Role.ADMIN;
  const isSupervisor =
    actor.orgRole === OrgRole.KEPALA_SEKSI && existing.author.supervisorId === actorId;
  if (!isAdmin && !isSupervisor) throw new AuthError("Forbidden", 403);
  if (existing.status !== PerformanceReportStatus.SUBMITTED) {
    throw new Error("Hanya laporan yang sudah diajukan yang dapat direview");
  }

  const row = await prisma.performanceReport.update({
    where: { id },
    data: {
      status: PerformanceReportStatus.REVIEWED,
      reviewedById: actorId,
      reviewedAt: new Date(),
      reviewerNote: reviewerNote ?? null,
    },
    include: reportInclude,
  });
  await logAudit(actorId, "PERFORMANCE_REPORT_REVIEW", `performanceReport:${id}`, { req });
  return row;
}

export async function getMeetingBrief(actorId: string, from: string, to: string) {
  const actor = await loadActor(actorId);
  if (actor.role !== Role.ADMIN && actor.orgRole !== OrgRole.KEPALA_SEKSI) {
    throw new AuthError("Forbidden", 403);
  }

  const where: Prisma.PerformanceReportWhereInput = {
    status: { in: [PerformanceReportStatus.SUBMITTED, PerformanceReportStatus.REVIEWED] },
    periodStart: {
      gte: new Date(`${from}T00:00:00.000Z`),
      lte: new Date(`${to}T00:00:00.000Z`),
    },
  };

  if (actor.role !== Role.ADMIN) {
    const reportIds = await prisma.user.findMany({
      where: { supervisorId: actor.id },
      select: { id: true },
    });
    where.authorId = { in: reportIds.map((r) => r.id) };
  }

  const items = await prisma.performanceReport.findMany({
    where,
    include: reportInclude,
    orderBy: [{ periodStart: "asc" }, { createdAt: "asc" }],
  });

  const units: StaffUnit[] = [StaffUnit.IT, StaffUnit.HUMAS, StaffUnit.AKADEMIK, StaffUnit.SUPPORT];
  const byUnit = units.map((unit) => ({
    unit,
    reports: items.filter((r) => r.author.unit === unit),
  }));

  const unassigned = items.filter((r) => !r.author.unit);

  return {
    from,
    to,
    total: items.length,
    byUnit,
    unassigned,
  };
}
