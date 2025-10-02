import React from "react";
import { Modal } from "../../../common/Modal";

/**
 * Modal de ajuda explicando os cálculos do dashboard
 */
export default function HelpModal({ onClose }) {
  return (
    <Modal title="Como calculamos o resumo" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p>
          Os valores exibidos consideram o mês selecionado (YYYY-MM) em dois
          eixos principais: emissão de pedidos e vencimento de promissórias.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Compras do mês</strong>: soma de total_liquido + frete_total
            dos pedidos com tipo &quot;COMPRA&quot; cuja <em>data_emissao</em>{" "}
            está dentro do mês selecionado.
          </li>
          <li>
            <strong>Promissórias (mês)</strong>: classificadas por{" "}
            <em>due_date</em> dentro do mês selecionado. São consideradas{" "}
            <em>Pagas</em> quando possuem <code>paid_at</code> definida;
            <em>Pendentes</em> quando <code>paid_at</code> é nulo e o vencimento
            ainda não passou;
            <em>Atrasadas</em> quando <code>paid_at</code> é nulo e o vencimento
            já passou.
          </li>
          <li>
            <strong>Vão para o próximo mês</strong>: promissórias em aberto (sem{" "}
            <code>paid_at</code>) cujo <em>due_date</em> está no mês
            imediatamente seguinte ao selecionado.
          </li>
          <li>
            <strong>Vieram de meses anteriores</strong>: promissórias em aberto
            (sem <code>paid_at</code>) cujo <em>due_date</em> é anterior ao mês
            selecionado (carry-over).
          </li>
        </ul>
        <p>
          Observação: os totais de pedidos não dependem do pagamento; o
          parcelamento (promissórias) reflete os recebíveis/pagáveis por
          vencimento.
        </p>
      </div>
    </Modal>
  );
}
