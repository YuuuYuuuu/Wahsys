import { prisma } from "@/lib/db/prisma";
import {
  LostReportStatus,
  FoundItemStatus,
  ClaimStatus,
  HandoverStatus,
  ReceiptStatus,
  MatchStatus,
  Role,
  Prisma,
} from "@prisma/client";
import { logAudit } from "@/lib/audit/audit";
import { AuthError } from "@/lib/http";
import { runMatchingForLostReport, runMatchingForFoundItem } from "./lost-found-matching.service";

function getYearMonthPrefix(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}${month}`;
}

async function generateCode(prefix: string, model: "lost" | "foundReport" | "foundItem" | "claim" | "handover"): Promise<string> {
  const ym = getYearMonthPrefix();
  let count = 0;
  if (model === "lost") count = await prisma.lostReport.count();
  else if (model === "foundReport") count = await prisma.foundReport.count();
  else if (model === "foundItem") count = await prisma.foundItem.count();
  else if (model === "claim") count = await prisma.claim.count();
  else if (model === "handover") count = await prisma.handover.count();

  let nextNum = count + 1;
  let code = `${prefix}-${ym}-${String(nextNum).padStart(3, "0")}`;

  if (model === "lost") {
    while (await prisma.lostReport.findUnique({ where: { ticketNumber: code } })) {
      nextNum++;
      code = `${prefix}-${ym}-${String(nextNum).padStart(3, "0")}`;
    }
  } else if (model === "foundReport") {
    while (await prisma.foundReport.findUnique({ where: { ticketNumber: code } })) {
      nextNum++;
      code = `${prefix}-${ym}-${String(nextNum).padStart(3, "0")}`;
    }
  } else if (model === "foundItem") {
    while (await prisma.foundItem.findUnique({ where: { itemCode: code } })) {
      nextNum++;
      code = `${prefix}-${ym}-${String(nextNum).padStart(3, "0")}`;
    }
  }

  return code;
}

// -------------------------------------------------------------
// 1. DASHBOARD STATS
// -------------------------------------------------------------
export async function getLostFoundDashboardStats() {
  const [
    totalLost,
    activeLost,
    resolvedLost,
    totalFound,
    availableFound,
    reservedFound,
    returnedFound,
    pendingClaims,
    approvedClaims,
    scheduledHandovers,
    completedHandovers,
  ] = await Promise.all([
    prisma.lostReport.count(),
    prisma.lostReport.count({ where: { status: { in: [LostReportStatus.SUBMITTED, LostReportStatus.PUBLISHED, LostReportStatus.MATCH_FOUND] } } }),
    prisma.lostReport.count({ where: { status: LostReportStatus.RESOLVED } }),
    prisma.foundItem.count(),
    prisma.foundItem.count({ where: { status: FoundItemStatus.AVAILABLE } }),
    prisma.foundItem.count({ where: { status: FoundItemStatus.RESERVED } }),
    prisma.foundItem.count({ where: { status: FoundItemStatus.RETURNED } }),
    prisma.claim.count({ where: { status: { in: [ClaimStatus.SUBMITTED, ClaimStatus.PENDING_REVIEW] } } }),
    prisma.claim.count({ where: { status: ClaimStatus.APPROVED } }),
    prisma.handover.count({ where: { status: HandoverStatus.SCHEDULED } }),
    prisma.handover.count({ where: { status: HandoverStatus.COMPLETED } }),
  ]);

  const returnRate = totalFound > 0 ? Math.round((returnedFound / totalFound) * 100) : 0;

  // Chart data: 6 bulan terakhir
  const monthlyStats: { month: string; lost: number; found: number; returned: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const monthName = start.toLocaleString("id-ID", { month: "short", year: "2-digit" });

    const [lostCount, foundCount, returnedCount] = await Promise.all([
      prisma.lostReport.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.foundItem.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.foundItem.count({ where: { returnedAt: { gte: start, lte: end } } }),
    ]);

    monthlyStats.push({ month: monthName, lost: lostCount, found: foundCount, returned: returnedCount });
  }

  // Laporan terkini
  const recentLost = await prisma.lostReport.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  const recentFound = await prisma.foundItem.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });

  return {
    overview: {
      totalLost,
      activeLost,
      resolvedLost,
      totalFound,
      availableFound,
      reservedFound,
      returnedFound,
      pendingClaims,
      approvedClaims,
      scheduledHandovers,
      completedHandovers,
      returnRate,
    },
    monthlyStats,
    recentLost,
    recentFound,
  };
}

// -------------------------------------------------------------
// 2. LOST REPORTS
// -------------------------------------------------------------
export async function listLostReports(params: {
  userId?: string;
  role?: Role;
  status?: LostReportStatus | "";
  category?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 15));
  const skip = (page - 1) * limit;

  const where: Prisma.LostReportWhereInput = {};

  // If user is regular (not admin/petugas), only show own reports unless public listing is required
  if (params.role !== Role.ADMIN && params.role !== Role.PETUGAS && params.userId) {
    where.userId = params.userId;
  }

  if (params.status) {
    where.status = params.status;
  }
  if (params.category) {
    where.category = params.category;
  }
  if (params.q) {
    where.OR = [
      { itemName: { contains: params.q } },
      { ticketNumber: { contains: params.q } },
      { description: { contains: params.q } },
      { lastLocation: { contains: params.q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.lostReport.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        matches: {
          take: 3,
          orderBy: { matchScore: "desc" },
          include: {
            foundItem: {
              select: { id: true, itemCode: true, itemName: true, status: true, storageLocation: true },
            },
          },
        },
      },
    }),
    prisma.lostReport.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getLostReportById(id: string) {
  const item = await prisma.lostReport.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      matches: {
        orderBy: { matchScore: "desc" },
        include: {
          foundItem: {
            select: {
              id: true,
              itemCode: true,
              itemName: true,
              category: true,
              foundLocation: true,
              foundDate: true,
              storageLocation: true,
              condition: true,
              status: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });
  if (!item) throw new Error("Laporan kehilangan tidak ditemukan");
  return item;
}

export async function createLostReport(
  userId: string,
  data: {
    itemName: string;
    category: string;
    description: string;
    lastLocation: string;
    lostDate: string;
    imageUrl?: string | null;
    additionalNotes?: string | null;
  },
  req?: Request
) {
  const ticketNumber = await generateCode("LOST", "lost");
  const created = await prisma.lostReport.create({
    data: {
      ticketNumber,
      userId,
      itemName: data.itemName,
      category: data.category,
      description: data.description,
      lastLocation: data.lastLocation,
      lostDate: new Date(data.lostDate),
      imageUrl: data.imageUrl ?? null,
      additionalNotes: data.additionalNotes ?? null,
      status: LostReportStatus.SUBMITTED,
    },
  });

  await logAudit(userId, "CREATE_LOST_REPORT", `LostReport:${created.id}`, {
    metadata: { ticketNumber, itemName: data.itemName },
    req,
  });

  // Run initial matching in background
  void runMatchingForLostReport(created.id);

  return created;
}

export async function updateLostReportStatus(
  id: string,
  actorId: string,
  actorRole: Role,
  data: { status: LostReportStatus; rejectionReason?: string },
  req?: Request
) {
  const existing = await prisma.lostReport.findUnique({ where: { id } });
  if (!existing) throw new Error("Laporan kehilangan tidak ditemukan");

  // Only Admin or Petugas can change status, or creator can CANCEL if still pending
  if (actorRole !== Role.ADMIN && actorRole !== Role.PETUGAS) {
    if (existing.userId !== actorId || data.status !== LostReportStatus.CANCELLED) {
      throw new AuthError("Tidak memiliki akses untuk mengubah status laporan ini", 403);
    }
  }

  const updated = await prisma.lostReport.update({
    where: { id },
    data: {
      status: data.status,
      rejectionReason: data.rejectionReason ?? existing.rejectionReason,
      resolvedAt: data.status === LostReportStatus.RESOLVED ? new Date() : existing.resolvedAt,
    },
  });

  await logAudit(actorId, "UPDATE_LOST_REPORT_STATUS", `LostReport:${id}`, {
    metadata: { oldStatus: existing.status, newStatus: data.status, reason: data.rejectionReason },
    req,
  });

  if (data.status === LostReportStatus.PUBLISHED) {
    void runMatchingForLostReport(id);
  }

  return updated;
}

// -------------------------------------------------------------
// 3. FOUND REPORTS & FOUND ITEMS
// -------------------------------------------------------------
export async function createFoundReport(
  finderId: string | null,
  data: {
    itemName: string;
    category: string;
    publicDescription: string;
    privateDescription?: string | null;
    foundLocation: string;
    foundDate: string;
    expiredAt?: string | null;
    imageUrl?: string | null;
    finderName?: string | null;
    finderContact?: string | null;
    registerAsInventory?: boolean;
    storageLocation?: string;
    condition?: string;
  },
  req?: Request
) {
  const ticketNumber = await generateCode("FND", "foundReport");

  const report = await prisma.foundReport.create({
    data: {
      ticketNumber,
      finderId: finderId ?? null,
      finderName: data.finderName ?? null,
      finderContact: data.finderContact ?? null,
      itemName: data.itemName,
      category: data.category,
      publicDescription: data.publicDescription,
      privateDescription: data.privateDescription ?? null,
      foundLocation: data.foundLocation,
      foundDate: new Date(data.foundDate),
      expiredAt: data.expiredAt ? new Date(data.expiredAt) : null,
      imageUrl: data.imageUrl ?? null,
      receiptStatus: data.registerAsInventory ? ReceiptStatus.RECEIVED : ReceiptStatus.PENDING,
    },
  });

  if (finderId) {
    await logAudit(finderId, "CREATE_FOUND_REPORT", `FoundReport:${report.id}`, {
      metadata: { ticketNumber, itemName: data.itemName },
      req,
    });
  }

  // Jika dicentang untuk didaftarkan langsung ke inventaris fisik oleh petugas
  let foundItem = null;
  if (data.registerAsInventory && data.storageLocation && data.condition) {
    const itemCode = await generateCode("FND", "foundItem");
    foundItem = await prisma.foundItem.create({
      data: {
        itemCode,
        foundReportId: report.id,
        itemName: data.itemName,
        category: data.category,
        publicDescription: data.publicDescription,
        privateDescription: data.privateDescription ?? null,
        foundLocation: data.foundLocation,
        foundDate: new Date(data.foundDate),
        expiredAt: data.expiredAt ? new Date(data.expiredAt) : null,
        storageLocation: data.storageLocation,
        condition: data.condition,
        imageUrl: data.imageUrl ?? null,
        status: FoundItemStatus.AVAILABLE,
        receivedById: finderId ?? null,
        receivedAt: new Date(),
      },
    });

    if (finderId) {
      await logAudit(finderId, "REGISTER_FOUND_ITEM", `FoundItem:${foundItem.id}`, {
        metadata: { itemCode, itemName: data.itemName },
        req,
      });
    }

    void runMatchingForFoundItem(foundItem.id);
  }

  return { report, foundItem };
}

export async function registerFoundItemDirectly(
  adminId: string,
  data: {
    foundReportId?: string | null;
    itemName: string;
    category: string;
    publicDescription: string;
    privateDescription?: string | null;
    foundLocation: string;
    foundDate: string;
    expiredAt?: string | null;
    storageLocation: string;
    condition: string;
    imageUrl?: string | null;
    status?: FoundItemStatus;
  },
  req?: Request
) {
  const itemCode = await generateCode("FND", "foundItem");

  const item = await prisma.foundItem.create({
    data: {
      itemCode,
      foundReportId: data.foundReportId ?? null,
      itemName: data.itemName,
      category: data.category,
      publicDescription: data.publicDescription,
      privateDescription: data.privateDescription ?? null,
      foundLocation: data.foundLocation,
      foundDate: new Date(data.foundDate),
      expiredAt: data.expiredAt ? new Date(data.expiredAt) : null,
      storageLocation: data.storageLocation,
      condition: data.condition,
      imageUrl: data.imageUrl ?? null,
      status: data.status ?? FoundItemStatus.AVAILABLE,
      receivedById: adminId,
      receivedAt: new Date(),
    },
  });

  if (data.foundReportId) {
    await prisma.foundReport.update({
      where: { id: data.foundReportId },
      data: { receiptStatus: ReceiptStatus.RECEIVED },
    });
  }

  await logAudit(adminId, "REGISTER_FOUND_ITEM", `FoundItem:${item.id}`, {
    metadata: { itemCode, itemName: data.itemName },
    req,
  });

  void runMatchingForFoundItem(item.id);

  return item;
}

export async function listFoundItems(params: {
  status?: FoundItemStatus | "";
  category?: string;
  location?: string;
  q?: string;
  page?: number;
  limit?: number;
  userRole?: Role;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 16));
  const skip = (page - 1) * limit;

  const where: Prisma.FoundItemWhereInput = {};

  if (params.status) {
    where.status = params.status;
  }
  if (params.category) {
    where.category = params.category;
  }
  if (params.location) {
    where.foundLocation = { contains: params.location };
  }
  if (params.q) {
    where.OR = [
      { itemName: { contains: params.q } },
      { itemCode: { contains: params.q } },
      { publicDescription: { contains: params.q } },
      { foundLocation: { contains: params.q } },
      { storageLocation: { contains: params.q } },
    ];
  }

  const [rawItems, total] = await Promise.all([
    prisma.foundItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { claims: true, matches: true } },
        receivedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.foundItem.count({ where }),
  ]);

  // Sembunyikan privateDescription dari non-admin/petugas (NFR-02)
  const isPrivileged = params.userRole === Role.ADMIN || params.userRole === Role.PETUGAS;
  const items = rawItems.map((item) => ({
    ...item,
    privateDescription: isPrivileged ? item.privateDescription : undefined,
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getFoundItemById(id: string, userRole?: Role) {
  const item = await prisma.foundItem.findUnique({
    where: { id },
    include: {
      receivedBy: { select: { id: true, name: true, email: true } },
      foundReport: {
        select: { id: true, ticketNumber: true, finderName: true, finderContact: true },
      },
      claims: {
        include: {
          claimant: { select: { id: true, name: true, email: true } },
          reviewedBy: { select: { id: true, name: true, email: true } },
          handover: true,
        },
        orderBy: { createdAt: "desc" },
      },
      matches: {
        include: {
          lostReport: {
            select: {
              id: true,
              ticketNumber: true,
              itemName: true,
              category: true,
              lastLocation: true,
              lostDate: true,
              status: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { matchScore: "desc" },
      },
    },
  });

  if (!item) throw new Error("Barang temuan tidak ditemukan");

  const isPrivileged = userRole === Role.ADMIN || userRole === Role.PETUGAS;
  return {
    ...item,
    privateDescription: isPrivileged ? item.privateDescription : undefined,
    // Sembunyikan klaim detail pengguna lain jika non-privileged
    claims: isPrivileged ? item.claims : item.claims.filter((c) => c.status === ClaimStatus.APPROVED),
  };
}

export async function updateFoundItem(
  id: string,
  adminId: string,
  data: Prisma.FoundItemUpdateInput,
  req?: Request
) {
  const existing = await prisma.foundItem.findUnique({ where: { id } });
  if (!existing) throw new Error("Barang temuan tidak ditemukan");

  const updated = await prisma.foundItem.update({
    where: { id },
    data,
  });

  await logAudit(adminId, "UPDATE_FOUND_ITEM", `FoundItem:${id}`, {
    metadata: { itemCode: existing.itemCode },
    req,
  });

  return updated;
}

// -------------------------------------------------------------
// 4. CLAIMS MANAGEMENT
// -------------------------------------------------------------
export async function submitClaim(
  userId: string,
  data: {
    foundItemId: string;
    ownershipDescription: string;
    evidencePhotos?: string[];
  },
  req?: Request
) {
  const item = await prisma.foundItem.findUnique({ where: { id: data.foundItemId } });
  if (!item) throw new Error("Barang temuan tidak ditemukan");
  if (item.status !== FoundItemStatus.AVAILABLE && item.status !== FoundItemStatus.CLAIM_PENDING) {
    throw new Error("Barang ini tidak tersedia untuk diklaim.");
  }

  // Cek apakah user sudah pernah mengajukan klaim aktif pada barang ini
  const existingClaim = await prisma.claim.findFirst({
    where: {
      foundItemId: data.foundItemId,
      claimantId: userId,
      status: { in: [ClaimStatus.SUBMITTED, ClaimStatus.PENDING_REVIEW, ClaimStatus.APPROVED] },
    },
  });
  if (existingClaim) {
    throw new Error("Anda sudah memiliki klaim aktif untuk barang ini.");
  }

  const claimNumber = await generateCode("CLM", "claim");

  const claim = await prisma.$transaction(async (tx) => {
    const c = await tx.claim.create({
      data: {
        claimNumber,
        foundItemId: data.foundItemId,
        claimantId: userId,
        ownershipDescription: data.ownershipDescription,
        evidencePhotos: data.evidencePhotos ?? [],
        status: ClaimStatus.PENDING_REVIEW,
      },
      include: {
        foundItem: { select: { itemCode: true, itemName: true } },
      },
    });

    if (item.status === FoundItemStatus.AVAILABLE) {
      await tx.foundItem.update({
        where: { id: item.id },
        data: { status: FoundItemStatus.CLAIM_PENDING },
      });
    }

    return c;
  });

  await logAudit(userId, "SUBMIT_CLAIM", `Claim:${claim.id}`, {
    metadata: { claimNumber, foundItemCode: item.itemCode },
    req,
  });

  return claim;
}

export async function listClaims(params: {
  userId?: string;
  role?: Role;
  status?: ClaimStatus | "";
  foundItemId?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 15));
  const skip = (page - 1) * limit;

  const where: Prisma.ClaimWhereInput = {};

  if (params.role !== Role.ADMIN && params.role !== Role.PETUGAS && params.userId) {
    where.claimantId = params.userId;
  }

  if (params.status) {
    where.status = params.status;
  }
  if (params.foundItemId) {
    where.foundItemId = params.foundItemId;
  }
  if (params.q) {
    where.OR = [
      { claimNumber: { contains: params.q } },
      { ownershipDescription: { contains: params.q } },
      { foundItem: { itemName: { contains: params.q } } },
      { foundItem: { itemCode: { contains: params.q } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.claim.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        claimant: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
        foundItem: {
          select: {
            id: true,
            itemCode: true,
            itemName: true,
            category: true,
            status: true,
            storageLocation: true,
            imageUrl: true,
          },
        },
        handover: true,
      },
    }),
    prisma.claim.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function reviewClaim(
  claimId: string,
  reviewerId: string,
  data: {
    status: ClaimStatus;
    rejectionReason?: string;
    reviewerNotes?: string;
    scheduledPickupDate?: string;
    pickupLocation?: string;
  },
  req?: Request
) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { foundItem: true },
  });
  if (!claim) throw new Error("Klaim tidak ditemukan");

  const updatedClaim = await prisma.$transaction(async (tx) => {
    // 1. Update status klaim
    const updated = await tx.claim.update({
      where: { id: claimId },
      data: {
        status: data.status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        rejectionReason: data.rejectionReason ?? null,
        reviewerNotes: data.reviewerNotes ?? null,
      },
    });

    if (data.status === ClaimStatus.APPROVED) {
      // 2. Ubah status barang menjadi RESERVED (FR-08.11)
      await tx.foundItem.update({
        where: { id: claim.foundItemId },
        data: { status: FoundItemStatus.RESERVED },
      });

      // 3. Tolak/tutup klaim lain pada barang yang sama (SRS 7.4 Rule 3)
      await tx.claim.updateMany({
        where: {
          foundItemId: claim.foundItemId,
          id: { not: claimId },
          status: { in: [ClaimStatus.SUBMITTED, ClaimStatus.PENDING_REVIEW, ClaimStatus.NEED_MORE_INFO] },
        },
        data: {
          status: ClaimStatus.REJECTED,
          rejectionReason: "Barang telah berhasil diklaim dan disetujui oleh pemilik sah lain.",
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });

      // 4. Otomatis buat jadwal Handover
      const handoverNumber = await generateCode("HND", "handover");
      await tx.handover.create({
        data: {
          handoverNumber,
          claimId: claim.id,
          recipientId: claim.claimantId,
          adminId: reviewerId,
          scheduledAt: data.scheduledPickupDate ? new Date(data.scheduledPickupDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          pickupLocation: data.pickupLocation ?? "Kantor Layanan Lost & Found / Customer Service",
          status: HandoverStatus.SCHEDULED,
        },
      });
    } else if (data.status === ClaimStatus.REJECTED) {
      // Jika ditolak dan tidak ada klaim lain yang aktif, kembalikan barang ke AVAILABLE
      const otherActiveClaims = await tx.claim.count({
        where: {
          foundItemId: claim.foundItemId,
          id: { not: claimId },
          status: { in: [ClaimStatus.SUBMITTED, ClaimStatus.PENDING_REVIEW, ClaimStatus.NEED_MORE_INFO, ClaimStatus.APPROVED] },
        },
      });
      if (otherActiveClaims === 0) {
        await tx.foundItem.update({
          where: { id: claim.foundItemId },
          data: { status: FoundItemStatus.AVAILABLE },
        });
      }
    }

    return updated;
  });

  await logAudit(reviewerId, "REVIEW_CLAIM", `Claim:${claimId}`, {
    metadata: { decision: data.status, reason: data.rejectionReason },
    req,
  });

  return updatedClaim;
}

// -------------------------------------------------------------
// 5. HANDOVERS
// -------------------------------------------------------------
export async function listHandovers(params: {
  userId?: string;
  role?: Role;
  status?: HandoverStatus | "";
  q?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 15));
  const skip = (page - 1) * limit;

  const where: Prisma.HandoverWhereInput = {};

  if (params.role !== Role.ADMIN && params.role !== Role.PETUGAS && params.userId) {
    where.recipientId = params.userId;
  }

  if (params.status) {
    where.status = params.status;
  }
  if (params.q) {
    where.OR = [
      { handoverNumber: { contains: params.q } },
      { pickupLocation: { contains: params.q } },
      { claim: { claimNumber: { contains: params.q } } },
      { claim: { foundItem: { itemName: { contains: params.q } } } },
      { claim: { foundItem: { itemCode: { contains: params.q } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.handover.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        recipient: { select: { id: true, name: true, email: true } },
        admin: { select: { id: true, name: true, email: true } },
        claim: {
          include: {
            foundItem: {
              select: {
                id: true,
                itemCode: true,
                itemName: true,
                category: true,
                storageLocation: true,
                status: true,
              },
            },
          },
        },
      },
    }),
    prisma.handover.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function completeHandover(
  handoverId: string,
  adminId: string,
  data: { notes?: string; proofPhotoUrl?: string | null },
  req?: Request
) {
  const handover = await prisma.handover.findUnique({
    where: { id: handoverId },
    include: { claim: { include: { foundItem: true } } },
  });
  if (!handover) throw new Error("Data serah terima tidak ditemukan");
  if (handover.status === HandoverStatus.COMPLETED) {
    throw new Error("Serah terima ini sudah selesai sebelumnya.");
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Selesaikan Handover
    const completed = await tx.handover.update({
      where: { id: handoverId },
      data: {
        status: HandoverStatus.COMPLETED,
        handoverAt: new Date(),
        notes: data.notes ?? handover.notes,
        proofPhotoUrl: data.proofPhotoUrl ?? handover.proofPhotoUrl,
        adminId,
      },
    });

    // 2. Ubah status klaim menjadi COMPLETED (FR-09.9)
    await tx.claim.update({
      where: { id: handover.claimId },
      data: { status: ClaimStatus.COMPLETED },
    });

    // 3. Ubah status barang temuan menjadi RETURNED (FR-09.8)
    await tx.foundItem.update({
      where: { id: handover.claim.foundItemId },
      data: {
        status: FoundItemStatus.RETURNED,
        returnedAt: new Date(),
      },
    });

    // 4. Jika ada lost report yang relevan dari user penerima, tandai RESOLVED
    await tx.lostReport.updateMany({
      where: {
        userId: handover.recipientId,
        itemName: { contains: handover.claim.foundItem.itemName },
        status: { in: [LostReportStatus.SUBMITTED, LostReportStatus.PUBLISHED, LostReportStatus.MATCH_FOUND] },
      },
      data: {
        status: LostReportStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });

    return completed;
  });

  await logAudit(adminId, "COMPLETE_HANDOVER", `Handover:${handoverId}`, {
    metadata: {
      handoverNumber: handover.handoverNumber,
      itemCode: handover.claim.foundItem.itemCode,
      recipientId: handover.recipientId,
    },
    req,
  });

  return result;
}

// -------------------------------------------------------------
// 6. OPERATIONAL REPORTS
// -------------------------------------------------------------
export async function getOperationalReports() {
  const [
    totalLost,
    resolvedLost,
    totalFound,
    returnedFound,
    unclaimedFound,
    totalClaims,
    approvedClaims,
    rejectedClaims,
    byCategory,
  ] = await Promise.all([
    prisma.lostReport.count(),
    prisma.lostReport.count({ where: { status: LostReportStatus.RESOLVED } }),
    prisma.foundItem.count(),
    prisma.foundItem.count({ where: { status: FoundItemStatus.RETURNED } }),
    prisma.foundItem.count({ where: { status: FoundItemStatus.UNCLAIMED } }),
    prisma.claim.count(),
    prisma.claim.count({ where: { status: { in: [ClaimStatus.APPROVED, ClaimStatus.COMPLETED] } } }),
    prisma.claim.count({ where: { status: ClaimStatus.REJECTED } }),
    prisma.foundItem.groupBy({
      by: ["category"],
      _count: { id: true },
    }),
  ]);

  const returnRate = totalFound > 0 ? ((returnedFound / totalFound) * 100).toFixed(1) : "0.0";
  const claimApprovalRate = totalClaims > 0 ? ((approvedClaims / totalClaims) * 100).toFixed(1) : "0.0";

  return {
    metrics: {
      totalLost,
      resolvedLost,
      totalFound,
      returnedFound,
      unclaimedFound,
      returnRate: `${returnRate}%`,
      totalClaims,
      approvedClaims,
      rejectedClaims,
      claimApprovalRate: `${claimApprovalRate}%`,
    },
    byCategory: byCategory.map((c) => ({
      category: c.category,
      count: c._count.id,
    })),
  };
}

