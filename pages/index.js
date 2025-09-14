import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { StatusNav } from "../components/layout/StatusNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { ClientForm } from "../components/ClientForm";
import { SupplierForm } from "../components/SupplierForm";
import { OrderForm } from "../components/OrderForm";
import React from "react";

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
  // Estados para controlar exibição dos formulários
  const [showClientForm, setShowClientForm] = React.useState(false);
  const [showSupplierForm, setShowSupplierForm] = React.useState(false);
  const [showOrderForm, setShowOrderForm] = React.useState(false);

  // Handlers para alternar exibição dos formulários
  const handleShowClientForm = () => {
    setShowClientForm(true);
    setShowSupplierForm(false);
    setShowOrderForm(false);
  };

  const handleShowSupplierForm = () => {
    setShowSupplierForm(true);
    setShowClientForm(false);
    setShowOrderForm(false);
  };

  const handleShowOrderForm = () => {
    setShowOrderForm(true);
    setShowClientForm(false);
    setShowSupplierForm(false);
  };

  // ...existing code...
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
            <button
              onClick={handleShowClientForm}
              className="px-3 py-1 bg-blue-200 rounded"
            >
              Cliente
            </button>
            <button
              onClick={handleShowSupplierForm}
              className="px-3 py-1 bg-green-200 rounded"
            >
              Fornecedor
            </button>
            <button
              onClick={handleShowOrderForm}
              className="px-3 py-1 bg-purple-200 rounded"
            >
              Pedido
            </button>
          </div>
          {showClientForm && <ClientForm />}
          {showSupplierForm && <SupplierForm />}
          {showOrderForm && <OrderForm />}
        </>
      )}
    </div>
  );
}

export default Home;
