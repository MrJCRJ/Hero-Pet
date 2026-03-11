"use client";

import React from "react";
import { Button } from "components/ui/Button";

/* eslint-disable no-unused-vars -- callback param names in interface */
interface AccessFormProps {
  accessCode: string;
  setAccessCode: (_value: string) => void;
  onSubmit: (_e: React.FormEvent) => void;
  incorrectCode?: boolean;
  hint?: string;
}
/* eslint-enable no-unused-vars */

export function AccessForm({
  accessCode,
  setAccessCode,
  onSubmit,
  incorrectCode,
  hint,
}: AccessFormProps) {
  return (
    <div className="card p-6 max-w-sm mx-auto text-center">
      <h2 className="text-lg font-semibold mb-2 text-[var(--color-text-primary)]">Acesso Administrativo</h2>
      <p className="mb-4 text-sm text-[var(--color-text-secondary)]">Digite o código de acesso:</p>
      {hint && (
        <p className="mb-2 text-[10px] text-[var(--color-text-secondary)] leading-snug">
          {hint}
        </p>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <input
          type="password"
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Código"
          autoComplete="off"
          aria-label="Código de acesso"
          className="w-full border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm bg-[var(--color-bg-primary)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-shadow"
        />
        <Button type="submit" variant="primary">
          Acessar
        </Button>
      </form>
      {incorrectCode && (
        <p className="text-red-500 mt-2 text-xs">
          Código incorreto. Tente novamente.
        </p>
      )}
    </div>
  );
}
