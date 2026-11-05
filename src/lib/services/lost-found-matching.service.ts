import { prisma } from "@/lib/db/prisma";
import { MatchStatus, FoundItemStatus, LostReportStatus } from "@prisma/client";

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function calculateMatchScore(
  lost: {
    itemName: string;
    category: string;
    description: string;
    lastLocation: string;
    lostDate: Date;
  },
  found: {
    itemName: string;
    category: string;
    publicDescription: string;
    foundLocation: string;
    foundDate: Date;
  }
): number {
  let score = 0;

  // 1. Kategori (30 poin)
  if (lost.category.trim().toLowerCase() === found.category.trim().toLowerCase()) {
    score += 30;
  }

  // 2. Kemiripan Nama & Kata Kunci (maksimal 35 poin)
  const lostTokens = tokenize(`${lost.itemName} ${lost.description}`);
  const foundTokens = tokenize(`${found.itemName} ${found.publicDescription}`);

  let tokenMatchCount = 0;
  for (const token of lostTokens) {
    if (foundTokens.has(token)) {
      tokenMatchCount++;
    }
  }

  if (lostTokens.size > 0) {
    const overlapRatio = Math.min(tokenMatchCount / Math.min(lostTokens.size, 5), 1);
    score += Math.round(overlapRatio * 35);
  }

  // 3. Kesamaan Lokasi (maksimal 20 poin)
  const lostLoc = lost.lastLocation.toLowerCase().trim();
  const foundLoc = found.foundLocation.toLowerCase().trim();
  if (lostLoc === foundLoc) {
    score += 20;
  } else if (lostLoc.includes(foundLoc) || foundLoc.includes(lostLoc)) {
    score += 15;
  } else {
    const lostLocTokens = tokenize(lostLoc);
    const foundLocTokens = tokenize(foundLoc);
    let locMatch = false;
    for (const t of lostLocTokens) {
      if (foundLocTokens.has(t)) {
        locMatch = true;
        break;
      }
    }
    if (locMatch) score += 10;
  }

  // 4. Kedekatan Tanggal (maksimal 15 poin)
  // Barang ditemukan harus pada atau setelah barang hilang
  const lostTime = new Date(lost.lostDate).getTime();
  const foundTime = new Date(found.foundDate).getTime();
  const diffDays = (foundTime - lostTime) / (1000 * 60 * 60 * 24);

  if (diffDays >= -1 && diffDays <= 7) {
    score += 15;
  } else if (diffDays > 7 && diffDays <= 14) {
    score += 10;
  } else if (diffDays > 14 && diffDays <= 30) {
    score += 5;
  }

  return Math.min(score, 100);
}

export async function runMatchingForLostReport(lostReportId: string): Promise<number> {
  const lost = await prisma.lostReport.findUnique({
    where: { id: lostReportId },
  });
  if (!lost || lost.status === LostReportStatus.RESOLVED || lost.status === LostReportStatus.CANCELLED) {
    return 0;
  }

  const foundItems = await prisma.foundItem.findMany({
    where: {
      status: { in: [FoundItemStatus.AVAILABLE, FoundItemStatus.CLAIM_PENDING] },
    },
  });

  let createdMatches = 0;

  for (const found of foundItems) {
    const score = calculateMatchScore(lost, found);
    if (score >= 40) {
      await prisma.itemMatch.upsert({
        where: {
          lostReportId_foundItemId: {
            lostReportId: lost.id,
            foundItemId: found.id,
          },
        },
        create: {
          lostReportId: lost.id,
          foundItemId: found.id,
          matchScore: score,
          matchStatus: MatchStatus.POTENTIAL,
        },
        update: {
          matchScore: score,
        },
      });
      createdMatches++;
    }
  }

  if (createdMatches > 0 && lost.status === LostReportStatus.PUBLISHED) {
    await prisma.lostReport.update({
      where: { id: lost.id },
      data: { status: LostReportStatus.MATCH_FOUND },
    });
  }

  return createdMatches;
}

export async function runMatchingForFoundItem(foundItemId: string): Promise<number> {
  const found = await prisma.foundItem.findUnique({
    where: { id: foundItemId },
  });
  if (!found || found.status !== FoundItemStatus.AVAILABLE) {
    return 0;
  }

  const lostReports = await prisma.lostReport.findMany({
    where: {
      status: { in: [LostReportStatus.SUBMITTED, LostReportStatus.PUBLISHED, LostReportStatus.MATCH_FOUND] },
    },
  });

  let createdMatches = 0;

  for (const lost of lostReports) {
    const score = calculateMatchScore(lost, found);
    if (score >= 40) {
      await prisma.itemMatch.upsert({
        where: {
          lostReportId_foundItemId: {
            lostReportId: lost.id,
            foundItemId: found.id,
          },
        },
        create: {
          lostReportId: lost.id,
          foundItemId: found.id,
          matchScore: score,
          matchStatus: MatchStatus.POTENTIAL,
        },
        update: {
          matchScore: score,
        },
      });
      createdMatches++;

      if (lost.status === LostReportStatus.PUBLISHED) {
        await prisma.lostReport.update({
          where: { id: lost.id },
          data: { status: LostReportStatus.MATCH_FOUND },
        });
      }
    }
  }

  return createdMatches;
}

