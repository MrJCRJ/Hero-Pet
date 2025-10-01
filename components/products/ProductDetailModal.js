import React from "react";
import { Modal } from "components/common/Modal";

export function ProductDetailModal({ target, loading, data, onClose, ChartComponent }) {
  if (!target) return null;
  return (
    <Modal onClose={onClose} title={`Histórico de Custos • ${target.nome}`}>
      <ChartComponent loading={loading} data={data} />
    </Modal>
  );
}
