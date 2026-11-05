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

export async function downloadItemDetailPdf(element: HTMLElement, filename = "lembar-data-aset.pdf") {
  const html2pdf = await getHtml2Pdf();
  const options = {
    margin: [8, 8, 8, 8],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  await html2pdf().from(element).set(options).save();
}
