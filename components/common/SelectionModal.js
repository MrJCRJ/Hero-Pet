import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";

export function SelectionModal({
  title,
  fetcher,
  extractLabel,
  onSelect,
  onClose,
  placeholder = "Buscar...",
  emptyMessage,
  footer,
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetcher(q);
        if (active) setItems(data || []);
      } catch (e) {
        if (active) setItems([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    const t = setTimeout(run, 150);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, fetcher]);

  const filtered = useMemo(() => {
    const qq = (q || "").toLowerCase();
    if (!qq) return items;
    return items.filter((it) => extractLabel(it).toLowerCase().includes(qq));
  }, [items, q, extractLabel]);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 border rounded px-2 py-1"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="max-h-80 overflow-auto border rounded">
        {loading && <div className="p-3 text-xs opacity-70">Carregando...</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-3 text-xs opacity-70">
            {emptyMessage || "Nenhum resultado"}
          </div>
        )}
        <ul>
          {filtered.map((it) => (
            <li key={it.id} className="border-b last:border-b-0">
              <button
                onClick={() => onSelect(it)}
                className="w-full text-left px-3 py-2 hover:bg-[var(--color-bg-secondary)]"
              >
                {extractLabel(it)}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {footer && <div className="mt-3 text-right">{footer}</div>}
    </Modal>
  );
}
