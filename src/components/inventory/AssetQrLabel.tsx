"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AssetQrLabel({
  assetCode,
  qrUrl,
  summaryLines,
}: {
  assetCode: string;
  qrUrl: string;
  summaryLines: string[];
}) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const labelText = useMemo(() => summaryLines.filter(Boolean).join(" · "), [summaryLines]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await QRCode.toDataURL(qrUrl, { margin: 2, width: 360, errorCorrectionLevel: "M" });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [qrUrl]);

  function downloadPng() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${assetCode}.png`;
    a.click();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(qrUrl);
    } catch {
      // no-op on older browser/privacy mode
    }
  }

  async function printLabel() {
    if (!dataUrl) return;
    setBusy(true);
    try {
      const w = window.open("", "_blank", "noopener,noreferrer,width=720,height=720");
      if (!w) return;
      w.document.write(`
        <html>
          <head>
            <title>${assetCode}</title>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <style>
              body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px; }
              .wrap { display: grid; place-items: center; gap: 12px; }
              .code { font-size: 18px; font-weight: 700; letter-spacing: 0.5px; }
              .meta { font-size: 12px; color: #334155; text-align: center; max-width: 520px; }
              img { width: 260px; height: 260px; image-rendering: pixelated; }
              .hint { font-size: 11px; color: #64748b; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="wrap">
              <img src="${dataUrl}" alt="QR ${assetCode}" />
              <div class="code">${assetCode}</div>
              <div class="meta">${escapeHtml(labelText)}</div>
              <div class="hint">Tempelkan QR secara fisik pada aset</div>
            </div>
            <script>
              window.onload = () => { window.print(); window.close(); };
            </script>
          </body>
        </html>
      `);
      w.document.close();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="border-border/80 p-4">
        <div className="flex flex-col items-center gap-2">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt={`QR ${assetCode}`} className="h-56 w-56 rounded-md border border-border bg-white p-2" />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground">
              Membuat QR…
            </div>
          )}
          <div className="text-base font-semibold">{assetCode}</div>
          <p className="text-center text-xs text-muted-foreground">{labelText || "—"}</p>
          <a
            href={qrUrl}
            target="_blank"
            rel="noreferrer"
            className="max-w-full truncate text-center text-xs text-primary underline-offset-2 hover:underline"
            title={qrUrl}
          >
            {qrUrl}
          </a>
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => void copyLink()}>
          Copy Link
        </Button>
        <Button type="button" variant="outline" onClick={downloadPng} disabled={!dataUrl || busy}>
          Download PNG
        </Button>
        <Button type="button" onClick={printLabel} disabled={!dataUrl || busy}>
          Print
        </Button>
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

