"use client";

/**
 * Skeleton de carregamento para o layout principal.
 * Exibido durante o fetch inicial de status.
 */
export function LoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 transition-colors">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-4 w-32" />
      <p className="text-sm text-[var(--color-text-secondary)] mt-4">
        Carregando...
      </p>
    </div>
  );
}
