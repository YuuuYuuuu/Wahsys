"use client";

import { Button } from "@/components/ui/button";
import type { OvertimeFormData } from "@/lib/lembur/form-defaults";

function displayValue(value: string | undefined | null, fallback: string = "-") {
  return value?.trim() ? value : fallback;
}

function renderActivityLines(activity: string) {
  if (!activity?.trim()) return ["-"];
  return activity
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[92px_12px_1fr] gap-1 leading-tight">
      <span>{label}</span>
      <span>:</span>
      <span>{displayValue(value)}</span>
    </div>
  );
}

export function LetterPreview({
  formData,
  previewRef,
  onDownloadPdf,
}: {
  formData: OvertimeFormData;
  previewRef: React.RefObject<HTMLElement | null>;
  onDownloadPdf: () => void;
}) {
  const activityLines = renderActivityLines(formData.activityDescription);

  return (
    <section className="rounded-lg border border-border/80 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold">Live preview</h2>
          <p className="text-sm text-muted-foreground">Preview surat lembur real-time.</p>
        </div>
        <Button variant="outline" onClick={onDownloadPdf}>
          Download PDF
        </Button>
      </div>

      <div className="max-h-[70dvh] overflow-auto bg-background p-4">
        <article
          ref={previewRef as unknown as React.RefObject<HTMLElement>}
          className="mx-auto w-[794px] bg-white px-5 py-5 font-sans text-[13px] text-black"
        >
          <div className="flex min-h-[1045px] flex-col border-[3px] border-black pb-4">
            <header className="border-b-[3px] border-black">
              <div className="grid grid-cols-[96px_1fr] items-center px-3 py-1.5">
                <div className="flex h-[80px] w-[80px] items-center justify-center overflow-hidden rounded border border-black text-[11px]">
                  {formData.companyLogoUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.companyLogoUrl} alt="Logo instansi" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-center leading-tight">LOGO</span>
                  )}
                </div>
                <div>
                  <h3 className="text-center font-serif text-[22px] leading-none tracking-[0.5px]">
                    {displayValue(formData.companyName)}
                  </h3>
                  <p className="mt-1 text-center text-[14px] font-semibold uppercase">{displayValue(formData.companyUnit)}</p>
                  <p className="mt-1 text-center text-[12px] leading-tight">{displayValue(formData.companyAddress)}</p>
                  <p className="text-center text-[12px] leading-tight">{displayValue(formData.companyContact)}</p>
                </div>
              </div>
            </header>

            <section className="space-y-5 px-2 pb-3 pt-5 text-[15px]">
              <div className="space-y-1">
                <p>Diperintahkan kepada :</p>
                <FieldRow label="Nama" value={formData.employeeName} />
                <FieldRow label="NIP/NOPEG" value={formData.employeeNip} />
                <FieldRow label="Golongan" value={formData.employeeGroup} />
                <FieldRow label="Unit Kerja" value={formData.employeeUnit} />
              </div>

              <div className="space-y-1">
                <p>Untuk melaksanakan kerja lembur pada:</p>
                <FieldRow label="Hari" value={formData.overtimeDay} />
                <FieldRow label="Tanggal" value={formData.date} />
                <FieldRow label="Pukul" value={`${displayValue(formData.startTime)}-${displayValue(formData.endTime)}`} />
                <div className="grid grid-cols-[92px_12px_1fr] gap-1 leading-tight">
                  <span>Pekerjaan</span>
                  <span>:</span>
                  <span className="space-y-1">
                    {activityLines.map((line, idx) => (
                      <span key={`${line}-${idx}`} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                </div>
              </div>

              <p className="pt-4">Demikian surat perintah lembur ini dibuat, untuk dipergunakan sebagaimana mestinya.</p>

              <div className="grid grid-cols-2 gap-10 pt-20">
                <div>
                  <p>Yang melaksanakan Kerja lembur</p>
                  <div className="mt-8 flex h-[66px] items-end">
                    {formData.executorSignatureUrl?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.executorSignatureUrl}
                        alt="Tanda tangan pelaksana"
                        className="h-[64px] max-w-[180px] object-contain object-left"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2">({displayValue(formData.executorName)})</p>
                </div>
                <div className="space-y-1">
                  <p>{displayValue(formData.signCityDate)}</p>
                  <p>Yang memberi perintah Atasan Langsung</p>
                  <p>{displayValue(formData.approverPosition)}</p>
                  <div className="mt-5 flex h-[66px] items-end">
                    {formData.approverSignatureUrl?.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.approverSignatureUrl}
                        alt="Tanda tangan atasan"
                        className="h-[64px] max-w-[180px] object-contain object-left"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2">({displayValue(formData.approverName)})</p>
                  <p>NIP {displayValue(formData.approverNip)}</p>
                </div>
              </div>
            </section>

            <p className="mt-auto px-4 pt-2 text-[11px] leading-tight">
              Catatan: Bahwa Surat Perintah Kerja lembur diberikan setiap pegawai yang diperintahkan untuk kerja lembur,
              bukan di buat rekapannya
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

