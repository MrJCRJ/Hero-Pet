import { Button } from "./ui/Button";
import { FormField } from "./ui/Form";

export function ClientForm({ form, setForm, step, setStep }) {

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };


  const handleNext = (e) => {
    e.preventDefault();
    setStep((prev) => prev + 1);
  };

  const handleBack = (e) => {
    e.preventDefault();
    setStep((prev) => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você pode adicionar a lógica de envio para o backend
    alert("Cliente cadastrado!\n" + JSON.stringify(form, null, 2));
  };

  return (
    <form
      onSubmit={step === 3 ? handleSubmit : handleNext}
      className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-md p-6 max-w-lg mx-auto mt-4"
    >
      <h2 className="text-xl font-bold mb-4 text-[var(--color-accent)]">Formulário do Cliente</h2>
      {step === 1 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Nome do Cliente"
            name="nome"
            placeholder="Nome do Cliente"
            value={form.nome}
            onChange={handleChange}
            required
          />
          <FormField
            label="CPF ou CNPJ"
            name="documento"
            placeholder="CPF ou CNPJ"
            value={form.documento}
            onChange={handleChange}
            required
          />
        </div>
      )}
      {step === 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="CEP"
            name="cep"
            placeholder="CEP"
            value={form.cep}
            onChange={handleChange}
          />
          <FormField
            label="Número do Endereço"
            name="numero"
            placeholder="Número do Endereço"
            value={form.numero}
            onChange={handleChange}
          />
          <div className="md:col-span-2">
            <FormField
              label="Complemento (opcional)"
              name="complemento"
              placeholder="Complemento (opcional)"
              value={form.complemento}
              onChange={handleChange}
            />
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Telefone"
            name="telefone"
            placeholder="Telefone"
            value={form.telefone}
            onChange={handleChange}
            type="tel"
          />
          <FormField
            label="Email"
            name="email"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={handleChange}
          />
          <div className="md:col-span-2 flex items-center gap-2 mt-4 mb-6">
            <input
              type="checkbox"
              name="ativo"
              checked={form.ativo}
              onChange={handleChange}
              className="w-4 h-4 accent-[var(--color-accent)] border-[var(--color-border)]"
            />
            <span className="text-[var(--color-text-secondary)]">Ativo</span>
          </div>
        </div>
      )}
      <div className="flex justify-between mt-8">
        {step > 1 && (
          <Button
            type="button"
            onClick={handleBack}
            variant="secondary"
            size="sm"
            fullWidth={false}
          >
            Voltar
          </Button>
        )}
        {step < 3 && (
          <Button
            type="submit"
            variant="primary"
            size="sm"
            fullWidth={false}
            className="ml-auto"
          >
            Próximo
          </Button>
        )}
        {step === 3 && (
          <Button
            type="submit"
            variant="primary"
            size="sm"
            fullWidth={false}
            className="ml-auto"
          >
            Enviar
          </Button>
        )}
      </div>
    </form>
  );
}
