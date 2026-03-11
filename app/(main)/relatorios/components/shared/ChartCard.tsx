"use client";

import React, { useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Camera } from "lucide-react";

export interface ChartCardProps {
  title?: string;
  children: React.ReactNode;
  /** Ex: "dre-01-2025" - se definido, exibe botão para exportar gráfico como PNG */
  exportFilename?: string;
}

export function ChartCard({ title, children, exportFilename }: ChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!chartRef.current || !exportFilename) return;
    const canvas = await html2canvas(chartRef.current, {
      backgroundColor: "transparent",
      scale: 2,
      useCORS: true,
    });
    const link = document.createElement("a");
    link.download = `grafico-${exportFilename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [exportFilename]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
      {(title || exportFilename) && (
        <div className="mb-4 flex items-center gap-2">
          {title && (
            <h3 className="flex-1 text-sm font-semibold text-[var(--color-text-primary)]">
              {title}
            </h3>
          )}
          {exportFilename && (
            <button
              type="button"
              onClick={handleExport}
              className="ml-auto rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
              title="Exportar gráfico como PNG"
            >
              <Camera className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <div ref={chartRef}>{children}</div>
    </div>
  );
}
