import React, { useState } from "react";
import { Button } from "components/ui/Button";

interface ComissoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ComissoesModal({ isOpen, onClose }: ComissoesModalProps) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const meses = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  const anos: number[] = [];
  for (let i = now.getFullYear(); i >= 2020; i--) {
    anos.push(i);
  }

  const handleGerar = () => {
    window.open(
      `/api/v1/pedidos/comissoes-vendas?mes=${mes}&ano=${ano}`,
      "_blank",
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-[var(--color-text-primary)]">
          Relatório de Comissões de Vendas
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label
              htmlFor="mes-select"
              className="block text-sm font-medium mb-2 text-[var(--color-text-primary)]"
            >
              Mês
            </label>
            <select
              id="mes-select"
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="ano-select"
              className="block text-sm font-medium mb-2 text-[var(--color-text-primary)]"
            >
              Ano
            </label>
            <select
              id="ano-select"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {anos.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>O relatório incluirá:</strong>
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc">
            <li>Todas as rações vendidas no período</li>
            <li>Total de vendas</li>
            <li>Comissão de 3%</li>
            <li>Comissão de 5%</li>
          </ul>
        </div>

        <div className="flex gap-3 justify-end">
          <Button onClick={onClose} variant="secondary" fullWidth={false}>
            Cancelar
          </Button>
          <Button onClick={handleGerar} variant="primary" fullWidth={false}>
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
