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
      const isJson = response.headers.get('content-type')?.includes('application/json');
      if (response.status === 503) {
        // Trata como indisponível mas sem lançar
        const payload = isJson ? await response.json() : null;
        setStatusData({
          status: payload, // ainda expõe para UI decidir render
          lastUpdate: new Date(),
          error: null,
          unreachable: true,
        });
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setStatusData({
        status: data,
        lastUpdate: new Date(),
        error: null,
        unreachable: false,
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
        .then(async (response) => {
          const isJson = response.headers.get('content-type')?.includes('application/json');
          if (response.status === 503) {
            const payload = isJson ? await response.json() : null;
            setStatusData((prev) => ({
              ...prev,
              status: payload,
              lastUpdate: new Date(),
              error: null,
              unreachable: true,
            }));
            return;
          }
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setStatusData((prev) => ({
            ...prev,
            status: data,
            lastUpdate: new Date(),
            error: null,
            unreachable: false,
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
  }, [fetchStatus]);

  return {
    status: statusData.status,
    lastUpdate: statusData.lastUpdate,
    error: statusData.error,
    loading,
    refetch: fetchStatus,
    refreshInterval: REFRESH_INTERVAL,
  };
}
