import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { StatusNav } from "../components/layout/StatusNav";
import { ThemeToggle } from "../components/ThemeToggle";
import React, { useEffect, useState } from "react";
import { EntitiesManager } from "components/entities";
// import { PedidoForm } from "../components/PedidoForm";
import { PedidoListManager } from "../components/pedidos/list";
import { ProductsManager } from "../components/products";
import { Button } from "../components/ui/Button";

const formConfig = {
  entities: { label: "Cliente / Fornecedor", Component: EntitiesManager },
  products: { label: "Produtos", Component: ProductsManager },
  orders: { label: "Pedidos", Component: PedidoListManager },
};

function Home() {
  const { status, loading, lastUpdate } = useStatus();
  const {
    showAdminPanel,
    accessCode,
    incorrectCode,
    setAccessCode,
    handleAccessCodeSubmit,
    handleLogout,
    user,
  } = useAuth();
  const [activeForm, setActiveForm] = useState("entities");
  const [entitiesHighlightId, setEntitiesHighlightId] = useState(null);
  const [linkSupplierId, setLinkSupplierId] = useState(null);

  // Permite navegar por hash ex: #tab=entities&highlightId=123
  useEffect(() => {
    function applyFromHash() {
      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash;
      const params = new URLSearchParams(hash);
      const tab = params.get("tab");
      if (tab && formConfig[tab]) setActiveForm(tab);
      const hid = params.get("highlightId");
      setEntitiesHighlightId(hid ? Number(hid) : null);
      const lsid = params.get("linkSupplierId");
      setLinkSupplierId(lsid ? Number(lsid) : null);
    }
    applyFromHash();
    window.addEventListener("hashchange", applyFromHash);
    return () => window.removeEventListener("hashchange", applyFromHash);
  }, []);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors">
        <h1 className="text-sm">Carregando...</h1>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 min-h-screen text-sm transition-colors">
      {!showAdminPanel ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-lg font-bold text-center">Hero-Pet</h1>
            <ThemeToggle />
          </div>
          <AccessForm
            accessCode={accessCode}
            setAccessCode={setAccessCode}
            onSubmit={handleAccessCodeSubmit}
            incorrectCode={incorrectCode}
          />
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-lg font-bold text-center">Sistema Hero-Pet</h1>
            <StatusNav status={status} lastUpdate={lastUpdate} compact />
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <AdminHeader
                onLogout={handleLogout}
                user={user || { name: "Usuário" }}
              />
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {Object.entries(formConfig).map(([key, { label }]) => (
              <Button
                key={key}
                onClick={() => setActiveForm(key)}
                variant={activeForm === key ? "primary" : "secondary"}
                fullWidth={false}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mb-8">
            {(() => {
              const active = formConfig[activeForm];
              if (!active) return null;
              const { Component } = active;
              if (Component === EntitiesManager)
                return (
                  <Component
                    browserLimit={20}
                    highlightId={entitiesHighlightId || undefined}
                  />
                );
              if (Component === ProductsManager)
                return (
                  <Component linkSupplierId={linkSupplierId || undefined} />
                );
              return <Component />;
            })()}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
