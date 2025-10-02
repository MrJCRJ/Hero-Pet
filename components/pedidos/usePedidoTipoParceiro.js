import React from "react";

export function usePedidoTipoParceiro(editingOrder) {
  const [tipo, setTipo] = React.useState(() => editingOrder?.tipo || "VENDA");
  const [originalTipo, setOriginalTipo] = React.useState(
    () => editingOrder?.tipo || "VENDA",
  );
  const [partnerId, setPartnerId] = React.useState(() =>
    String(editingOrder?.partner_entity_id || ""),
  );
  const [partnerLabel, setPartnerLabel] = React.useState(
    () => editingOrder?.partner_name || "",
  );
  const [partnerName, setPartnerName] = React.useState(
    () => editingOrder?.partner_name || "",
  );
  const [showTypeChangeModal, setShowTypeChangeModal] = React.useState(false);
  const [pendingTipo, setPendingTipo] = React.useState("");

  React.useEffect(() => {
    if (!editingOrder) return;
    const t = editingOrder.tipo || "VENDA";
    setTipo(t);
    setOriginalTipo(t);
    setPartnerId(String(editingOrder.partner_entity_id || ""));
    setPartnerLabel(editingOrder.partner_name || "");
    setPartnerName(editingOrder.partner_name || "");
  }, [editingOrder]);

  function handleTipoChange(novoTipo) {
    if (!editingOrder || novoTipo === originalTipo) {
      setTipo(novoTipo);
      return;
    }
    setPendingTipo(novoTipo);
    setShowTypeChangeModal(true);
  }
  function confirmTipoChange() {
    setTipo(pendingTipo);
    setShowTypeChangeModal(false);
    setPendingTipo("");
    // reset parceiro ao trocar tipo em edição
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
  }
  function cancelTipoChange() {
    setShowTypeChangeModal(false);
    setPendingTipo("");
  }

  return {
    tipo,
    setTipo,
    originalTipo,
    partnerId,
    partnerLabel,
    partnerName,
    setPartnerId,
    setPartnerLabel,
    setPartnerName,
    showTypeChangeModal,
    pendingTipo,
    handleTipoChange,
    confirmTipoChange,
    cancelTipoChange,
  };
}
