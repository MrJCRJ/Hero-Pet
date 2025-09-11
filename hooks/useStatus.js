// hooks/useStatus.js

import { useState, useEffect, useCallback } from "react";

// 🔹 Custom Hook para gerenciar o estado do status
export function useStatus() {
  const [statusData, setStatusData] = useState({
    status: null,
    lastUpdate: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/status");
      const data = await res.json();
      setStatusData({ status: data, lastUpdate: new Date() });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { ...statusData, loading, fetchStatus };
}
