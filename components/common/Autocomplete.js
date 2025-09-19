import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";

export function Autocomplete({
  label,
  placeholder = "Digite para buscar...",
  fetcher, // async (q) => Promise<Array<{ id, label, value }>>
  onSelect,
  initialValue,
  disabled = false,
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const boxRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!q || q.length < 2) return setItems([]);
      try {
        const arr = await fetcher(q);
        if (active) setItems(arr);
      } catch (_) {
        if (active) setItems([]);
      }
    };
    const t = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, fetcher]);

  return (
    <div className="relative" ref={boxRef}>
      {label && (
        <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">{label}</label>
      )}
      <div className="flex gap-2">
        <input
          value={q}
          onChange={(e) => {
            if (disabled) return;
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)]"
        />
        {initialValue && !disabled && (
          <Button
            variant="outline"
            size="sm"
            fullWidth={false}
            onClick={() => onSelect(null)}
            title="Limpar seleção"
          >
            Limpar
          </Button>
        )}
      </div>
      {open && !disabled && items.length > 0 && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow">
          <ul className="max-h-60 overflow-auto text-sm">
            {items.map((it) => (
              <li
                key={it.id}
                tabIndex={0}
                onClick={() => {
                  onSelect(it);
                  setQ("");
                  setItems([]);
                  setOpen(false);
                }}
                className="px-3 py-2 cursor-pointer hover:bg-[var(--color-bg-secondary)]"
              >
                {it.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
