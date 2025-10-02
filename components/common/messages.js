// Dicionário central de mensagens de UI (sucesso/erro/avisos)
// Mantém consistência e facilita futura i18n.

export const MSG = {
  // Produtos
  PROD_CREATED: "Produto criado",
  PROD_UPDATED: "Produto atualizado",
  PROD_INACTIVATED: "Produto inativado",
  PROD_REACTIVATED: "Produto reativado",
  PROD_HARD_DELETED: "Produto excluído definitivamente",
  PROD_SAVE_ERROR: "Erro ao salvar produto",
  PROD_DELETE_ERROR: "Erro ao excluir definitivamente",
  PROD_TOGGLE_ERROR: "Falha na operação",

  // Pedidos
  PEDIDO_CREATED: "Pedido criado",
  PEDIDO_UPDATED: "Pedido atualizado",
  PEDIDO_DELETED: "Pedido excluído",
  PEDIDO_DELETE_ERROR: "Erro ao excluir pedido",
  PEDIDO_LOAD_ERROR: "Erro ao carregar pedido",
  PEDIDOS_LOAD_ERROR: "Erro ao carregar pedidos",
  PEDIDOS_EMPTY: "Nenhum pedido encontrado",
  LOADING_GENERIC: "Carregando...",
  // Templates dinâmicos
  ORDER_DELETED_SUCCESS: (id) => `Pedido #${id} excluído.`,
  ORDER_DELETE_CONFIRM_TITLE: (id) => `Excluir Pedido #${id}`,
  ORDER_DELETE_CONFIRM_MESSAGE: (id) =>
    `Tem certeza que deseja excluir o pedido #${id}?\n\nEsta ação também remove itens, movimentos de estoque e parcelas associadas. Não pode ser desfeita.`,

  // Promissórias
  PROMISSORIA_DATE_PAID_WARN: "Parcela já paga – alteração não será aplicada.",

  // Entidades
  ENTITY_CREATED: "Entidade criada",
  ENTITY_UPDATED: "Entidade atualizada",
  ENTITY_DELETED: "Entidade excluída",
  ENTITY_DELETE_ERROR: "Erro ao excluir entidade",
  ENTITY_CONFLICT: "Já existe uma entidade com este documento",

  // Genéricos
  GENERIC_ERROR: "Operação falhou",
};

// Helper simples para acessar chave com fallback:
export function msg(key, fallback) {
  return MSG[key] || fallback || key;
}
