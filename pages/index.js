import { useStatus } from "../hooks/useStatus";
import { useAuth } from "../hooks/useAuth";
import { AccessForm } from "../components/admin/AccessForm";
import { AdminHeader } from "../components/admin/AdminHeader";
import { StatusNav } from "../components/layout/StatusNav";
import { ThemeToggle } from "../components/ThemeToggle";
import { ClientForm } from "../components/ClientForm";
import { FornecedorForm } from "../components/FornecedorForm";
import { PedidoForm } from "../components/PedidoForm";
import { Button } from "../components/ui/Button";
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
  // Estado do formulário de fornecedor e etapa
  const [supplierForm, setSupplierForm] = React.useState({
    nomeEmpresa: "",
    cnpj: "",
    endereco: "",
    telefone: "",
    email: "",
    ativo: true,
  });
  const [supplierStep, setSupplierStep] = React.useState(1);
  const [showOrderForm, setShowOrderForm] = React.useState(false);
  // Estado do formulário de pedido e etapa
  const [orderForm, setOrderForm] = React.useState({
    clienteId: "",
    produto: "",
    quantidade: 1,
    observacao: "",
  });
  const [orderStep, setOrderStep] = React.useState(1);

  // Estado do formulário de cliente e etapa
  const [clientForm, setClientForm] = React.useState({
    nome: "",
    documento: "",
    cep: "",
    numero: "",
    complemento: "",
    telefone: "",
    email: "",
    ativo: true,
  });
  const [clientStep, setClientStep] = React.useState(1);

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
            <Button
              onClick={handleShowClientForm}
              variant={showClientForm ? "primary" : "secondary"}
              fullWidth={false}
            >
              Cliente
            </Button>
            <Button
              onClick={handleShowSupplierForm}
              variant={showSupplierForm ? "primary" : "secondary"}
              fullWidth={false}
            >
              Fornecedor
            </Button>
            <Button
              onClick={handleShowOrderForm}
              variant={showOrderForm ? "primary" : "secondary"}
              fullWidth={false}
            >
              Pedido
            </Button>
          </div>
          {showClientForm && (
            <ClientForm
              form={clientForm}
              setForm={setClientForm}
              step={clientStep}
              setStep={setClientStep}
            />
          )}
          {showSupplierForm && (
            <FornecedorForm
              form={supplierForm}
              setForm={setSupplierForm}
              step={supplierStep}
              setStep={setSupplierStep}
            />
          )}
          {showOrderForm && (
            <PedidoForm
              form={orderForm}
              setForm={setOrderForm}
              step={orderStep}
              setStep={setOrderStep}
            />
          )}
        </>
      )}
    </div>
  );
}

export default Home;
