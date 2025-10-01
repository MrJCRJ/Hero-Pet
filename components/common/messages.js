// Dicionário central de mensagens de UI (sucesso/erro/avisos)
// Mantém consistência e facilita futura i18n.

export const MSG = {
  // Produtos
  PROD_CREATED: 'Produto criado',
  PROD_UPDATED: 'Produto atualizado',
  PROD_INACTIVATED: 'Produto inativado',
  PROD_REACTIVATED: 'Produto reativado',
  PROD_HARD_DELETED: 'Produto excluído definitivamente',
  PROD_SAVE_ERROR: 'Erro ao salvar produto',
  PROD_DELETE_ERROR: 'Erro ao excluir definitivamente',
  PROD_TOGGLE_ERROR: 'Falha na operação',

  // Pedidos
  PEDIDO_CREATED: 'Pedido criado',
  PEDIDO_UPDATED: 'Pedido atualizado',
  PEDIDO_DELETED: 'Pedido excluído',
  PEDIDO_DELETE_ERROR: 'Erro ao excluir pedido',

  // Promissórias
  PROMISSORIA_DATE_PAID_WARN: 'Parcela já paga – alteração não será aplicada.',

  // Entidades
  ENTITY_CREATED: 'Entidade criada',
  ENTITY_UPDATED: 'Entidade atualizada',
  ENTITY_DELETED: 'Entidade excluída',
  ENTITY_DELETE_ERROR: 'Erro ao excluir entidade',
  ENTITY_CONFLICT: 'Já existe uma entidade com este documento',

  // Genéricos
  GENERIC_ERROR: 'Operação falhou',
};

// Helper simples para acessar chave com fallback:
export function msg(key, fallback) {
  return MSG[key] || fallback || key;
}