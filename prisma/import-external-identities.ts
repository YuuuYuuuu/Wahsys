import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (ch === "," && !quoted) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    throw new Error(
      "Path CSV wajib. Contoh: npm run db:import:external-identity -- ./data/external-identities.csv"
    );
  }
  const csvPath = path.resolve(process.cwd(), arg);
  const text = await readFile(csvPath, "utf8");
  const rows = parseCsv(text);
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const itemId = row.itemId?.trim();
    const assetCode = row.assetCode?.trim();
    const externalAssetCode = row.externalAssetCode?.trim() || null;
    const externalQrValue = row.externalQrValue?.trim() || null;
    const externalQrImageUrl = row.externalQrImageUrl?.trim() || null;

    if (!externalAssetCode || !externalQrValue) {
      skipped++;
      continue;
    }

    let targetId: string | null = null;
    if (itemId) {
      targetId = itemId;
    } else if (assetCode) {
      const found = await prisma.item.findUnique({ where: { assetCode }, select: { id: true } });
      targetId = found?.id ?? null;
    }

    if (!targetId) {
      skipped++;
      continue;
    }

    await prisma.item.update({
      where: { id: targetId },
      data: {
        externalAssetCode,
        externalQrValue,
        externalQrImageUrl,
      },
    });
    updated++;
  }

  console.log(`Import selesai. updated=${updated}, skipped=${skipped}, total=${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
