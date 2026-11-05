"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OvertimeFormData, OvertimeFormErrors } from "@/lib/lembur/form-defaults";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function FileInput({
  label,
  name,
  accept,
  onFileChange,
}: {
  label: string;
  name: keyof OvertimeFormData;
  accept: string;
  onFileChange: (name: keyof OvertimeFormData, file: File) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="file"
        accept={accept}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          onFileChange(name, f);
        }}
      />
    </div>
  );
}

export function OvertimeForm({
  mode,
  formData,
  errors,
  onChange,
  onFileChange,
  onOpenEmail,
}: {
  mode: "full" | "quick";
  formData: OvertimeFormData;
  errors: OvertimeFormErrors;
  onChange: (name: keyof OvertimeFormData, value: string) => void;
  onFileChange: (name: keyof OvertimeFormData, file: File) => void;
  onOpenEmail: () => void;
}) {
  const isQuick = mode === "quick";

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="border-b border-border/80">
        <CardTitle className="text-base">Form lembur</CardTitle>
        <p className="text-sm text-muted-foreground">Ikuti format surat lembur resmi seperti dokumen instansi.</p>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {!isQuick && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Kop surat</h3>
            </div>
            <div className="grid gap-4">
              <FileInput label="File logo (opsional)" name="companyLogoUrl" accept="image/*" onFileChange={onFileChange} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Nama instansi</Label>
                  <Input value={formData.companyName} onChange={(e) => onChange("companyName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Input value={formData.companyUnit} onChange={(e) => onChange("companyUnit", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Alamat</Label>
                <Input value={formData.companyAddress} onChange={(e) => onChange("companyAddress", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Kontak</Label>
                <Input value={formData.companyContact} onChange={(e) => onChange("companyContact", e.target.value)} />
              </div>
            </div>
          </section>
        )}

        {!isQuick && (
          <section className="space-y-4">
            <h3 className="text-sm font-semibold">Data pegawai</h3>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input value={formData.employeeName} onChange={(e) => onChange("employeeName", e.target.value)} />
                <FieldError message={errors.employeeName} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>NIP/NOPEG</Label>
                  <Input value={formData.employeeNip} onChange={(e) => onChange("employeeNip", e.target.value)} />
                  <FieldError message={errors.employeeNip} />
                </div>
                <div className="space-y-1.5">
                  <Label>Golongan</Label>
                  <Input value={formData.employeeGroup} onChange={(e) => onChange("employeeGroup", e.target.value)} />
                  <FieldError message={errors.employeeGroup} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Unit kerja</Label>
                <Input value={formData.employeeUnit} onChange={(e) => onChange("employeeUnit", e.target.value)} />
                <FieldError message={errors.employeeUnit} />
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Detail lembur</h3>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Hari</Label>
                <Input placeholder="Contoh: Jumat" value={formData.overtimeDay} onChange={(e) => onChange("overtimeDay", e.target.value)} />
                <FieldError message={errors.overtimeDay} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal</Label>
                <Input type="date" value={formData.date} onChange={(e) => onChange("date", e.target.value)} />
                <FieldError message={errors.date} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Jam mulai</Label>
                <Input type="time" value={formData.startTime} onChange={(e) => onChange("startTime", e.target.value)} />
                <FieldError message={errors.startTime} />
              </div>
              <div className="space-y-1.5">
                <Label>Jam selesai</Label>
                <Input type="time" value={formData.endTime} onChange={(e) => onChange("endTime", e.target.value)} />
                <FieldError message={errors.endTime} />
              </div>
              <div className="space-y-1.5">
                <Label>Total jam</Label>
                <Input value={formData.totalHours} readOnly className="bg-muted/40" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Pekerjaan</Label>
              <Textarea
                rows={4}
                placeholder="Pisahkan baris untuk lebih dari satu aktivitas."
                value={formData.activityDescription}
                onChange={(e) => onChange("activityDescription", e.target.value)}
              />
              <FieldError message={errors.activityDescription} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold">Penandatangan</h3>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Kota, tanggal surat</Label>
              <Input
                placeholder="Contoh: Jakarta, 12 Februari 2026"
                value={formData.signCityDate}
                onChange={(e) => onChange("signCityDate", e.target.value)}
              />
              <FieldError message={errors.signCityDate} />
            </div>

            {!isQuick && (
              <>
                <div className="space-y-1.5">
                  <Label>Nama pelaksana lembur</Label>
                  <Input value={formData.executorName} onChange={(e) => onChange("executorName", e.target.value)} />
                  <FieldError message={errors.executorName} />
                </div>
                <FileInput
                  label="File tanda tangan pelaksana"
                  name="executorSignatureUrl"
                  accept="image/*"
                  onFileChange={onFileChange}
                />
              </>
            )}

            {isQuick && (
              <FileInput label="File tanda tangan pelaksana" name="executorSignatureUrl" accept="image/*" onFileChange={onFileChange} />
            )}
            <FieldError message={errors.executorSignatureUrl} />

            {!isQuick && (
              <>
                <div className="space-y-1.5">
                  <Label>Nama atasan</Label>
                  <Input value={formData.approverName} onChange={(e) => onChange("approverName", e.target.value)} />
                  <FieldError message={errors.approverName} />
                </div>
                <div className="space-y-1.5">
                  <Label>Jabatan atasan</Label>
                  <Input value={formData.approverPosition} onChange={(e) => onChange("approverPosition", e.target.value)} />
                  <FieldError message={errors.approverPosition} />
                </div>
                <div className="space-y-1.5">
                  <Label>NIP atasan</Label>
                  <Input value={formData.approverNip} onChange={(e) => onChange("approverNip", e.target.value)} />
                  <FieldError message={errors.approverNip} />
                </div>
                <FileInput
                  label="File tanda tangan atasan"
                  name="approverSignatureUrl"
                  accept="image/*"
                  onFileChange={onFileChange}
                />
              </>
            )}
          </div>
        </section>

        <Button onClick={onOpenEmail}>Kirim email</Button>
      </CardContent>
    </Card>
  );
}

