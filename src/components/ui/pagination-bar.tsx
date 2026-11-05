"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  /** jumlah item di halaman saat ini (untuk range “dari–sampai”) */
  itemCount: number;
};

type Props = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Tampilkan bar walaupun hanya 1 halaman (default: sembunyikan jika totalPages <= 1) */
  alwaysShow?: boolean;
};

export function PaginationBar({ meta, onPageChange, alwaysShow = false }: Props) {
  const { page, pageSize, total, totalPages, itemCount } = meta;
  if (!alwaysShow && totalPages <= 1) return null;

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeTo = total === 0 ? 0 : Math.min(total, (page - 1) * pageSize + itemCount);

  return (
    <div className="flex flex-col gap-3 border-t border-border/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Menampilkan {rangeFrom}–{rangeTo} dari {total} · Halaman {page} dari {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Sebelumnya
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

export function paginatedMeta(
  total: number,
  page: number,
  pageSize: number,
  itemCount: number
): PaginationMeta {
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const totalPages = Math.max(1, Math.ceil(total / safeSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return { total, page: safePage, pageSize: safeSize, totalPages, itemCount };
}
