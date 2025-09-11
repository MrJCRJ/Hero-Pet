import { useEffect, useState } from "react";

// 🔹 Card genérico
function Card({ title, status, children }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h2 className="flex justify-between items-center mb-4 border-b pb-2 text-lg font-semibold">
        {title}
        {status && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${status === "healthy"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
              }`}
          >
            {status === "healthy" ? "Healthy" : "Error"}
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

// 🔹 Linha de info
function Info({ label, value }) {
  return (
    <div className="mb-2">
      <span className="font-medium text-gray-500">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// 🔹 Seção dentro do card
function Section({ title, children }) {
  return (
    <div className="mt-3 pt-3 border-t border-dashed">
      <h3 className="text-sm font-medium text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

// 🔹 Página principal
function Home() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [incorrectCode, setIncorrectCode] = useState(false);

  useEffect(() => {
    const isAuthenticated =
      localStorage.getItem("adminAuthenticated") === "true";
    if (isAuthenticated) setShowAdminPanel(true);

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/v1/status");
      const data = await res.json();
      setStatus(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Erro ao buscar status:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleAccessCodeSubmit = (e) => {
    e.preventDefault();
    if (accessCode === "hero123") {
      setShowAdminPanel(true);
      setIncorrectCode(false);
      localStorage.setItem("adminAuthenticated", "true");
    } else {
      setIncorrectCode(true);
    }
  };

  const handleLogout = () => {
    setShowAdminPanel(false);
    setAccessCode("");
    localStorage.removeItem("adminAuthenticated");
  };

  if (loading) return <h1 className="text-center p-10">Carregando...</h1>;

  return (
    <div className="max-w-5xl mx-auto p-6 min-h-screen">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
        Sistema Hero-Pet
      </h1>

      {!showAdminPanel ? (
        <div className="bg-white rounded-xl shadow p-6 max-w-sm mx-auto text-center">
          <h2 className="text-lg font-semibold mb-3">Acesso Administrativo</h2>
          <p className="text-gray-600 mb-4">
            Para acessar o painel de status do sistema, digite o código de
            acesso:
          </p>
          <form onSubmit={handleAccessCodeSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Código de acesso"
              className="border rounded-md p-2"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white rounded-md py-2 font-semibold hover:bg-indigo-700"
            >
              Acessar
            </button>
          </form>
          {incorrectCode && (
            <p className="text-red-600 mt-3">Código incorreto. Tente novamente.</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Painel de Status</h2>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white rounded-md px-4 py-1 font-semibold hover:bg-red-600"
            >
              Sair
            </button>
          </div>

          <p className="text-center text-gray-500 mb-6">
            {lastUpdate && `Última atualização: ${lastUpdate.toLocaleTimeString()}`}
          </p>

          {status ? (
            <>
              <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <Card title="Banco de Dados" status={status.dependencies.database.status}>
                  <Info label="Versão" value={status.dependencies.database.version} />
                  <Info
                    label="Conexões"
                    value={`${status.dependencies.database.current_connections} / ${status.dependencies.database.max_connections}`}
                  />
                  <Section title="Latência (ms)">
                    <Info
                      label="Primeira query"
                      value={status.dependencies.database.latency.first_query.toFixed(2)}
                    />
                    <Info
                      label="Segunda query"
                      value={status.dependencies.database.latency.second_query.toFixed(2)}
                    />
                    <Info
                      label="Terceira query"
                      value={status.dependencies.database.latency.third_query.toFixed(2)}
                    />
                  </Section>
                </Card>

                <Card title="Web Server" status={status.dependencies.webserver.status}>
                  <Info label="Provedor" value={status.dependencies.webserver.provider} />
                  <Info label="Ambiente" value={status.dependencies.webserver.environment} />
                  <Info
                    label="Região"
                    value={
                      status.dependencies.webserver.vercel_region ||
                      status.dependencies.webserver.aws_region ||
                      "N/A"
                    }
                  />
                  <Info label="Fuso horário" value={status.dependencies.webserver.timezone} />
                  <Info label="Versão" value={status.dependencies.webserver.version} />
                </Card>

                <Card title="Último Commit">
                  {status.dependencies.webserver.last_commit_author ? (
                    <>
                      <Info label="Autor" value={status.dependencies.webserver.last_commit_author} />
                      <Info label="Mensagem" value={status.dependencies.webserver.last_commit_message} />
                      <Info
                        label="SHA"
                        value={status.dependencies.webserver.last_commit_message_sha?.substring(
                          0,
                          7
                        )}
                      />
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Nenhuma informação de commit disponível
                    </p>
                  )}
                </Card>
              </div>

              <div className="text-center mt-6">
                <button
                  onClick={fetchStatus}
                  className="bg-indigo-600 text-white rounded-md px-5 py-2 font-semibold hover:bg-indigo-700"
                >
                  Atualizar Dados
                </button>
              </div>
            </>
          ) : (
            <p className="text-center">Não foi possível carregar os dados.</p>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
