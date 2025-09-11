import { useEffect, useState } from "react";

// 🔹 Card genérico
function Card({ title, status, children }) {
  return (
    <div className="bg-white rounded-lg shadow p-3 text-sm">
      <h2 className="flex justify-between items-center mb-2 border-b pb-1 text-sm font-semibold">
        {title}
        {status && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status === "healthy"
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
    <div className="mb-1">
      <span className="font-medium text-gray-500">{label}: </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

// 🔹 Seção dentro do card
function Section({ title, children }) {
  return (
    <div className="mt-2 pt-2 border-t border-dashed">
      <h3 className="text-xs font-medium text-gray-500 mb-1">{title}</h3>
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

  if (loading)
    return <h1 className="text-center p-6 text-sm">Carregando...</h1>;

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen text-sm">
      <h1 className="text-lg font-bold text-center mb-4 text-gray-800">
        Sistema Hero-Pet
      </h1>

      {!showAdminPanel ? (
        <div className="bg-white rounded-lg shadow p-4 max-w-xs mx-auto text-center">
          <h2 className="text-base font-semibold mb-2">
            Acesso Administrativo
          </h2>
          <p className="text-gray-600 mb-3 text-sm">
            Digite o código de acesso:
          </p>
          <form
            onSubmit={handleAccessCodeSubmit}
            className="flex flex-col gap-2"
          >
            <input
              type="password"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Código"
              className="border rounded-md p-1.5 text-sm"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white rounded-md py-1.5 text-sm font-semibold hover:bg-indigo-700"
            >
              Acessar
            </button>
          </form>
          {incorrectCode && (
            <p className="text-red-600 mt-2 text-xs">
              Código incorreto. Tente novamente.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">Painel de Status</h2>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white rounded-md px-3 py-1 text-xs font-semibold hover:bg-red-600"
            >
              Sair
            </button>
          </div>

          <p className="text-center text-gray-500 mb-4 text-xs">
            {lastUpdate &&
              `Última atualização: ${lastUpdate.toLocaleTimeString()}`}
          </p>

          {status ? (
            <>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {/* Banco de Dados */}
                <Card
                  title="Banco de Dados"
                  status={status.dependencies.database.status}
                >
                  <Info
                    label="Versão"
                    value={status.dependencies.database.version}
                  />
                  <Info
                    label="Conexões"
                    value={`${status.dependencies.database.current_connections} / ${status.dependencies.database.max_connections}`}
                  />
                  <Section title="Latência (ms)">
                    <Info
                      label="Primeira query"
                      value={status.dependencies.database.latency.first_query.toFixed(
                        2,
                      )}
                    />
                    <Info
                      label="Segunda query"
                      value={status.dependencies.database.latency.second_query.toFixed(
                        2,
                      )}
                    />
                    <Info
                      label="Terceira query"
                      value={status.dependencies.database.latency.third_query.toFixed(
                        2,
                      )}
                    />
                  </Section>
                </Card>

                {/* Webserver */}
                <Card
                  title="Web Server"
                  status={status.dependencies.webserver.status}
                >
                  <Info
                    label="Provedor"
                    value={status.dependencies.webserver.provider}
                  />
                  <Info
                    label="Ambiente"
                    value={status.dependencies.webserver.environment}
                  />
                  <Info
                    label="Região"
                    value={
                      status.dependencies.webserver.vercel_region ||
                      status.dependencies.webserver.aws_region ||
                      "N/A"
                    }
                  />
                  <Info
                    label="Fuso horário"
                    value={status.dependencies.webserver.timezone}
                  />
                  <Info
                    label="Versão"
                    value={status.dependencies.webserver.version}
                  />
                </Card>

                {/* Commit */}
                <Card title="Último Commit">
                  {status.dependencies.webserver.last_commit_author ? (
                    <>
                      <Info
                        label="Autor"
                        value={status.dependencies.webserver.last_commit_author}
                      />
                      <Info
                        label="Mensagem"
                        value={
                          status.dependencies.webserver.last_commit_message
                        }
                      />
                      <Info
                        label="SHA"
                        value={status.dependencies.webserver.last_commit_message_sha?.substring(
                          0,
                          7,
                        )}
                      />
                    </>
                  ) : (
                    <p className="text-gray-500 text-xs">
                      Nenhuma informação disponível
                    </p>
                  )}
                </Card>
              </div>

              <div className="text-center mt-4">
                <button
                  onClick={fetchStatus}
                  className="bg-indigo-600 text-white rounded-md px-3 py-1 text-sm font-semibold hover:bg-indigo-700"
                >
                  Atualizar
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-sm">
              Não foi possível carregar os dados.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
