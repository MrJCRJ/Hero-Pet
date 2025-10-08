import React from "react";

export function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onGoToPage,
  onNextPage,
  onPrevPage,
  loading,
}) {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Ajustar se não há páginas suficientes no final
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
      <div className="text-[10px] text-[var(--color-text-secondary)]">
        Página {currentPage} de {totalPages}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={!hasPrevPage || loading}
          className="px-2 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Anterior
        </button>

        {startPage > 1 && (
          <>
            <button
              type="button"
              onClick={() => onGoToPage(0)}
              disabled={loading}
              className="px-2 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              1
            </button>
            {startPage > 2 && (
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                ...
              </span>
            )}
          </>
        )}

        {pages.map((pageNum) => (
          <button
            key={pageNum}
            type="button"
            onClick={() => onGoToPage(pageNum - 1)} // converter para zero-based
            disabled={loading}
            className={`px-2 py-1 text-[10px] rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              pageNum === currentPage
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                : "border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)]"
            }`}
          >
            {pageNum}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                ...
              </span>
            )}
            <button
              type="button"
              onClick={() => onGoToPage(totalPages - 1)} // converter para zero-based
              disabled={loading}
              className="px-2 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onNextPage}
          disabled={!hasNextPage || loading}
          className="px-2 py-1 text-[10px] rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Próxima ›
        </button>
      </div>
    </div>
  );
}
