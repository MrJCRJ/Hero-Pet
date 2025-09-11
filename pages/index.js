// pages/index.js
import { useEffect, useState } from "react";

function Home() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch("/api/v1/status");
        const data = await response.json();
        setStatus(data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error("Erro ao buscar status:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <h1 style={{ textAlign: "center", padding: "20px" }}>Carregando...</h1>;

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ textAlign: "center", marginBottom: "10px" }}>Hero-Pet Dashboard</h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "30px" }}>
        {lastUpdate && `Última atualização: ${lastUpdate.toLocaleTimeString()}`}
      </p>

      {status ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "30px" }}>
            {/* Card do Banco de Dados */}
            <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
                Banco de Dados
                <span style={{
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  backgroundColor: status.dependencies.database.status === "healthy" ? "#dcfce7" : "#fee2e2",
                  color: status.dependencies.database.status === "healthy" ? "#16a34a" : "#dc2626"
                }}>
                  {status.dependencies.database.status === "healthy" ? "Healthy" : "Error"}
                </span>
              </h2>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Versão: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.database.version}</span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Conexões: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.database.current_connections} / {status.dependencies.database.max_connections}</span>
              </div>
              <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed #eee" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "10px", color: "#666" }}>Latência (ms)</h3>
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ fontWeight: "500", color: "#666" }}>Primeira query: </span>
                  <span style={{ fontWeight: "600" }}>{status.dependencies.database.latency.first_query.toFixed(2)}</span>
                </div>
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ fontWeight: "500", color: "#666" }}>Segunda query: </span>
                  <span style={{ fontWeight: "600" }}>{status.dependencies.database.latency.second_query.toFixed(2)}</span>
                </div>
                <div>
                  <span style={{ fontWeight: "500", color: "#666" }}>Terceira query: </span>
                  <span style={{ fontWeight: "600" }}>{status.dependencies.database.latency.third_query.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Card do Web Server */}
            <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <h2 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
                Web Server
                <span style={{
                  padding: "5px 10px",
                  borderRadius: "20px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  backgroundColor: status.dependencies.webserver.status === "healthy" ? "#dcfce7" : "#fee2e2",
                  color: status.dependencies.webserver.status === "healthy" ? "#16a34a" : "#dc2626"
                }}>
                  {status.dependencies.webserver.status === "healthy" ? "Healthy" : "Error"}
                </span>
              </h2>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Provedor: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.provider}</span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Ambiente: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.environment}</span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Região: </span>
                <span style={{ fontWeight: "600" }}>
                  {status.dependencies.webserver.vercel_region || status.dependencies.webserver.aws_region || "N/A"}
                </span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Fuso horário: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.timezone}</span>
              </div>
              <div style={{ marginBottom: "10px" }}>
                <span style={{ fontWeight: "500", color: "#666" }}>Versão: </span>
                <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.version}</span>
              </div>
            </div>

            {/* Card do Último Commit */}
            <div style={{ background: "white", borderRadius: "8px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
              <h2 style={{ marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #eee" }}>
                Último Commit
              </h2>
              {status.dependencies.webserver.last_commit_author ? (
                <>
                  <div style={{ marginBottom: "10px" }}>
                    <span style={{ fontWeight: "500", color: "#666" }}>Autor: </span>
                    <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.last_commit_author}</span>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <span style={{ fontWeight: "500", color: "#666" }}>Mensagem: </span>
                    <span style={{ fontWeight: "600" }}>{status.dependencies.webserver.last_commit_message}</span>
                  </div>
                  <div style={{ marginBottom: "10px" }}>
                    <span style={{ fontWeight: "500", color: "#666" }}>SHA: </span>
                    <span style={{ fontWeight: "600" }}>
                      {status.dependencies.webserver.last_commit_message_sha?.substring(0, 7)}
                    </span>
                  </div>
                </>
              ) : (
                <p style={{ color: "#666" }}>Nenhuma informação de commit disponível</p>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Atualizar Dados
            </button>
          </div>
        </div>
      ) : (
        <p>Não foi possível carregar os dados.</p>
      )}
    </div>
  );
}

export default Home;