/**
 * Constantes e configurações para componentes de pedidos
 */

// Mapeamento de títulos para modals
export const CARD_TITLES = {
  comprasMes: "Compras do mês",
  crescimento_mom: "Crescimento (mês vs. anterior)",
  lucro_bruto: "Lucro bruto",
  promissorias_pendentes: "Promissórias pendentes (mês)",
  promissorias_atrasadas: "Promissórias atrasadas (mês)",
  proximo_mes: "Vão para o próximo mês",
  carry_over: "Vieram de meses anteriores",
};

// Configuração dos cards do dashboard
export const DASHBOARD_CARDS = [
  {
    key: "crescimento_mom",
    title: "Crescimento (MoM)",
    getValue: (data) =>
      data.crescimentoMoMPerc == null
        ? "—"
        : `${Number(data.crescimentoMoMPerc).toFixed(2)}%`,
    getSubtitle: (data) =>
      data.vendasMesAnterior != null
        ? `Receita: ${data.vendasMes} · Receita anterior: ${data.vendasMesAnterior}`
        : `Receita: ${data.vendasMes}`,
    formatSubtitle: true, // indica que precisa formatar valores monetários
  },
  {
    key: "lucro_bruto",
    title: "Lucro bruto",
    getValue: (data) =>
      `${data.lucroBrutoMes} (${data.margemBrutaPerc?.toFixed?.(2) ?? Number(data.margemBrutaPerc || 0).toFixed(2)}%)`,
    getSubtitle: (data) =>
      `Receita: ${data.vendasMes} · COGS: ${data.cogsReal}`,
    formatValue: true,
    formatSubtitle: true,
  },
  {
    key: "comprasMes",
    title: "Compras do mês",
    getValue: (data) => data.comprasMes,
    getSubtitle: () => null,
    formatValue: true,
  },
  {
    key: "promissorias_pendentes",
    title: "Promissórias pendentes (mês)",
    getValue: (data) =>
      `${data.promissorias?.mesAtual?.pendentes?.count ?? 0} itens`,
    getSubtitle: (data) => data.promissorias?.mesAtual?.pendentes?.valor ?? 0,
    formatSubtitle: true,
  },
  {
    key: "promissorias_atrasadas",
    title: "Promissórias atrasadas (mês)",
    getValue: (data) =>
      `${data.promissorias?.mesAtual?.atrasados?.count ?? 0} itens`,
    getSubtitle: (data) => data.promissorias?.mesAtual?.atrasados?.valor ?? 0,
    formatSubtitle: true,
  },
  {
    key: "proximo_mes",
    title: "Vão para o próximo mês",
    getValue: (data) => `${data.promissorias.proximoMes.pendentes.count} itens`,
    getSubtitle: (data) => data.promissorias.proximoMes.pendentes.valor,
    formatSubtitle: true,
  },
  {
    key: "carry_over",
    title: "Vieram de meses anteriores",
    getValue: (data) =>
      `${data.promissorias.deMesesAnteriores.emAberto.count} itens`,
    getSubtitle: (data) => data.promissorias.deMesesAnteriores.emAberto.valor,
    formatSubtitle: true,
  },
];

// Status de promissórias
export const PROMISSORIA_STATUS = {
  PENDING: "pending",
  LATE: "late",
  NEXT: "next",
  CARRY_OVER: "carry_over",
};

// Configurações da API
export const API_ENDPOINTS = {
  SUMMARY: "/api/v1/pedidos/summary",
  PROMISSORIAS: "/api/v1/promissorias",
};

// Chaves do localStorage
export const STORAGE_KEYS = {
  ORDERS_MONTH: "orders:month",
};

// Eventos customizados
export const CUSTOM_EVENTS = {
  SET_FILTERS: "orders:set-filters",
};
