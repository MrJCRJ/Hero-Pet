"use client";

import { ReactNode } from "react";

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Container padrão para conteúdo de página com título e descrição opcionais.
 * Melhora consistência visual e hierarquia.
 */
export function PageSection({
  title,
  description,
  actions,
  children,
  className = "",
}: PageSectionProps) {
  return (
    <section
      className={`rounded-lg ${className}`}
      aria-labelledby={title ? "page-section-title" : undefined}
    >
      {(title || description || actions) && (
        <header className="mb-6 flex flex-wrap justify-between items-start gap-4">
          <div>
            {title && (
              <h2
                id="page-section-title"
                className="text-lg font-semibold text-[var(--color-text-primary)] mb-1"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}
