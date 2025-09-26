import { useCallback, useMemo, useState } from "react";

const LIST_LIMIT = Number(process.env.NEXT_PUBLIC_PRODUCTS_LIMIT) || 500;

export function useProducts() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ativo, setAtivo] = useState("true"); // default: somente ativos
  const [loading, setLoading] = useState(false);
  const query = useMemo(() => ({ q, categoria, ativo }), [q, categoria, ativo]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (categoria) params.set("categoria", categoria);
      if (ativo !== "") params.set("ativo", ativo);
      params.set("limit", String(LIST_LIMIT));
      params.set("meta", "1");
      const resp = await fetch(`/api/v1/produtos?${params.toString()}`, {
        cache: "no-store",
      });
      if (!resp.ok) throw new Error(`GET produtos ${resp.status}`);
      const json = await resp.json();
      const data = Array.isArray(json) ? json : json.data;
      const meta = Array.isArray(json) ? { total: null } : json.meta;
      setRows(data);
      setTotal(meta?.total ?? null);
    } finally {
      setLoading(false);
    }
  }, [q, categoria, ativo]);

  const refresh = useCallback(() => {
    fetchList();
  }, [fetchList]);

  return {
    rows,
    total,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    refresh,
  };
}
