"use client";

type Html2PdfInstance = {
  from: (el: HTMLElement) => Html2PdfInstance;
  set: (opts: object) => Html2PdfInstance;
  save: () => Promise<void>;
  toPdf: () => Html2PdfInstance;
  get: (key: "pdf") => Promise<{ output: (type: "datauristring") => string }>;
};

async function getHtml2Pdf(): Promise<() => Html2PdfInstance> {
  const mod = (await import("html2pdf.js")) as unknown as { default: () => Html2PdfInstance };
  return mod.default;
}

const defaultOptions = {
  margin: [2, 2, 2, 2],
  filename: "surat-lembur.pdf",
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2, useCORS: true, letterRendering: true },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  pagebreak: { mode: ["avoid-all", "css", "legacy"] },
};

export async function downloadOvertimePdf(element: HTMLElement) {
  const html2pdf = await getHtml2Pdf();
  await html2pdf().from(element).set(defaultOptions).save();
}

export async function generateOvertimePdfBase64(element: HTMLElement): Promise<string> {
  const html2pdf = await getHtml2Pdf();
  const pdf = await html2pdf().from(element).set(defaultOptions).toPdf().get("pdf");
  const uri = pdf.output("datauristring");
  const idx = uri.indexOf(",");
  return idx >= 0 ? uri.slice(idx + 1) : uri;
}

