export type OvertimeFormData = {
  companyLogoUrl: string;
  companyName: string;
  companyUnit: string;
  companyAddress: string;
  companyContact: string;
  employeeName: string;
  employeeNip: string;
  employeeGroup: string;
  employeeUnit: string;
  overtimeDay: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: string;
  activityDescription: string;
  signCityDate: string;
  approverName: string;
  approverPosition: string;
  approverNip: string;
  executorName: string;
  executorSignatureUrl: string;
  approverSignatureUrl: string;
};

export const defaultProfile: OvertimeFormData = {
  companyLogoUrl: "",
  companyName: "INSTITUT TEKNOLOGI BANDUNG",
  companyUnit: "DIREKTORAT EKSEKUTIF MULTI KAMPUS",
  companyAddress: "Jalan Let. Jen. Purn. Dr. (HC) Mashudi No. 1/Jalan Raya Jatinangor KM 20,75 Sumedang",
  companyContact: "Telp (022) 7798600, 7798634. Faks (022) 7798617 Email: multicampus@itb.ac.id",
  employeeName: "Wahyu Adi Saputro. S.Kom.",
  employeeNip: "1180000123",
  employeeGroup: "-",
  employeeUnit: "Direktorat Eksekutif Multi Kampus",
  overtimeDay: "",
  date: "",
  startTime: "",
  endTime: "",
  totalHours: "0 Jam",
  activityDescription: "",
  signCityDate: "",
  approverName: "Mushaf Isnain Perdana, S.AP.",
  approverPosition: "Kasie. Akademik, Kemahasiswaan, dan Layanan Kampus Jakarta",
  approverNip: "1180000099",
  executorName: "Wahyu Adi Saputro. S.Kom.",
  executorSignatureUrl: "",
  approverSignatureUrl: "",
};

export const quickEditableFields: (keyof OvertimeFormData)[] = [
  "overtimeDay",
  "date",
  "startTime",
  "endTime",
  "signCityDate",
  "activityDescription",
  "executorSignatureUrl",
];

export function calculateTotalHours(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "0 Jam";
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  if (!Number.isFinite(startHour) || !Number.isFinite(startMinute) || !Number.isFinite(endHour) || !Number.isFinite(endMinute)) {
    return "0 Jam";
  }

  const startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;
  if (endTotalMinutes < startTotalMinutes) endTotalMinutes += 24 * 60;
  const diffMinutes = endTotalMinutes - startTotalMinutes;
  return `${(diffMinutes / 60).toFixed(2)} Jam`;
}

export function mergeWithTotalHours(data: OvertimeFormData): OvertimeFormData {
  return { ...data, totalHours: calculateTotalHours(data.startTime, data.endTime) };
}

export type OvertimeFormErrors = Partial<Record<keyof OvertimeFormData, string>>;

export function validateFullForm(formData: OvertimeFormData): OvertimeFormErrors {
  const nextErrors: OvertimeFormErrors = {};

  if (!formData.employeeName.trim()) nextErrors.employeeName = "Nama wajib diisi.";
  if (!formData.employeeNip.trim()) nextErrors.employeeNip = "NIP/NOPEG wajib diisi.";
  if (!formData.employeeGroup.trim()) nextErrors.employeeGroup = "Golongan wajib diisi.";
  if (!formData.employeeUnit.trim()) nextErrors.employeeUnit = "Unit kerja wajib diisi.";
  if (!formData.overtimeDay.trim()) nextErrors.overtimeDay = "Hari wajib diisi.";
  if (!formData.date) nextErrors.date = "Tanggal wajib diisi.";
  if (!formData.startTime) nextErrors.startTime = "Jam mulai wajib diisi.";
  if (!formData.endTime) nextErrors.endTime = "Jam selesai wajib diisi.";
  if (!formData.activityDescription.trim()) nextErrors.activityDescription = "Pekerjaan wajib diisi.";
  if (!formData.signCityDate.trim()) nextErrors.signCityDate = "Kota dan tanggal wajib diisi.";
  if (!formData.approverName.trim()) nextErrors.approverName = "Nama atasan wajib diisi.";
  if (!formData.approverPosition.trim()) nextErrors.approverPosition = "Jabatan atasan wajib diisi.";
  if (!formData.approverNip.trim()) nextErrors.approverNip = "NIP atasan wajib diisi.";
  if (!formData.executorName.trim()) nextErrors.executorName = "Nama pelaksana wajib diisi.";

  return nextErrors;
}

export function validateQuickForm(formData: OvertimeFormData): OvertimeFormErrors {
  const nextErrors: OvertimeFormErrors = {};
  if (!formData.overtimeDay.trim()) nextErrors.overtimeDay = "Hari wajib diisi.";
  if (!formData.date) nextErrors.date = "Tanggal lembur wajib diisi.";
  if (!formData.startTime) nextErrors.startTime = "Jam mulai wajib diisi.";
  if (!formData.endTime) nextErrors.endTime = "Jam selesai wajib diisi.";
  if (!formData.activityDescription.trim()) nextErrors.activityDescription = "Pekerjaan wajib diisi.";
  if (!formData.signCityDate.trim()) nextErrors.signCityDate = "Tanggal tanda tangan wajib diisi.";
  if (!formData.executorSignatureUrl) nextErrors.executorSignatureUrl = "Tanda tangan wajib diunggah.";
  return nextErrors;
}

/** Mengisi field yang hilang dari profil default (untuk snapshot API). */
export function parseFormSnapshot(json: unknown): OvertimeFormData {
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const o = json as Partial<OvertimeFormData>;
    return mergeWithTotalHours({ ...defaultProfile, ...o });
  }
  return mergeWithTotalHours({ ...defaultProfile });
}

