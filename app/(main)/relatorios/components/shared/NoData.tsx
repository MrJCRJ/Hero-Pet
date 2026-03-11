"use client";

import React from "react";
import { Inbox } from "lucide-react";

export interface NoDataProps {
  message?: string;
}

export function NoData({ message = "Nenhum dado disponível para o período selecionado." }: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--color-text-secondary)]">
      <Inbox className="mb-4 h-12 w-12 opacity-50" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  );
}
