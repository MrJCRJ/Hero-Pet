import { useState, useEffect, useCallback, useRef } from "react";

// 🔹 Constantes para configuração
const STATUS_API_URL = "/api/v1/status";
const REFRESH_INTERVAL = 60000; // 1 minuto

// 🔹 Custom Hook para gerenciar o estado do status
export function useStatus() {
  const [statusData, setStatusData] = useState({
    status: null,
    lastUpdate: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(STATUS_API_URL);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatusData({
        status: data,
        lastUpdate: new Date(),
        error: null,
      });
    } catch (err) {
      console.error("Erro ao buscar status:", err);
      setStatusData((prev) => ({
        ...prev,
        error: err.message,
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial do status
    fetchStatus();

    // Limpa o intervalo anterior se existir
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Configura o novo intervalo
    intervalRef.current = setInterval(() => {
      fetch(STATUS_API_URL)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          setStatusData((prev) => ({
            ...prev,
            status: data,
            lastUpdate: new Date(),
            error: null,
          }));
        })
        .catch((err) => {
          console.error("Erro ao buscar status:", err);
          setStatusData((prev) => ({
            ...prev,
            error: err.message,
          }));
        });
    }, REFRESH_INTERVAL);

    // Limpa o intervalo quando o componente for desmontado
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status: statusData.status,
    lastUpdate: statusData.lastUpdate,
    error: statusData.error,
    loading,
    refetch: fetchStatus,
    refreshInterval: REFRESH_INTERVAL,
  };
}
