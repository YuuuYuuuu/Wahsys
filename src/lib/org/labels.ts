import type { OrgRole, PerformancePeriodType, PerformanceReportStatus, StaffUnit } from "@prisma/client";

export const STAFF_UNIT_LABELS: Record<StaffUnit, string> = {
  IT: "IT",
  HUMAS: "Humas",
  AKADEMIK: "Akademik",
  SUPPORT: "Support",
};

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  KEPALA_SEKSI: "Kepala Seksi",
  STAFF: "Staff",
};

export const PERIOD_TYPE_LABELS: Record<PerformancePeriodType, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
};

export const REPORT_STATUS_LABELS: Record<PerformanceReportStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Diajukan",
  REVIEWED: "Direview",
};
