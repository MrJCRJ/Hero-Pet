import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { StatusNav } from "../components/layout/StatusNav";
import { ThemeToggle } from "../components/ThemeToggle";
import React, { useState } from "react";
import { EntitiesManager } from "components/entities";
import { PedidoForm } from "../components/PedidoForm";
import { Button } from "../components/ui/Button";

const formConfig = {
  entities: { label: "Cliente / Fornecedor", Component: EntitiesManager },
  orders: { label: "Pedido", Component: PedidoForm },
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
  } = useAuth();
  const [activeForm, setActiveForm] = useState("entities");

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
              <AdminHeader onLogout={handleLogout} user={{ name: "José" }} />
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
                return <Component browserLimit={20} />;
              return <Component />;
            })()}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
