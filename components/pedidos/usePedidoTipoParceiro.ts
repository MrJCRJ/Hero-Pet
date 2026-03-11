import React from "react";

export function usePedidoTipoParceiro(
  editingOrder?: Record<string, unknown> | null
) {
  const [tipo, setTipo] = React.useState<string>(
    () => (editingOrder?.tipo as string) || "VENDA"
  );
  const [originalTipo, setOriginalTipo] = React.useState<string>(
    () => (editingOrder?.tipo as string) || "VENDA"
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
    const t = (editingOrder.tipo as string) || "VENDA";
    setTipo(t);
    setOriginalTipo(t);
    setPartnerId(String(editingOrder.partner_entity_id ?? ""));
    setPartnerLabel(String(editingOrder.partner_name ?? ""));
    setPartnerName(String(editingOrder.partner_name ?? ""));
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
