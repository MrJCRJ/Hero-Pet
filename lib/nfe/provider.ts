/**
 * Abstração para provedor de NF-e (NFe.io, Focus NFe, Webmania, Acras).
 * Implementação stub: retorna erro indicando que integração não está configurada.
 * Para produção, implementar cliente HTTP que chama a API do provedor escolhido.
 */

export interface EmitirNFePayload {
  pedidoId: number;
  cliente: {
    nome: string;
    document: string;
    email?: string;
    endereco?: {
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
    };
  };
  itens: Array<{
    descricao: string;
    ncm: string;
    cfop: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
  }>;
  total: number;
}

export interface EmitirNFeResult {
  ok: boolean;
  chaveAcesso?: string;
  protocolo?: string;
  danfeUrl?: string;
  xmlUrl?: string;
  erro?: string;
}

export interface ConsultarNFeResult {
  status: string;
  chaveAcesso?: string;
  protocolo?: string;
  danfeUrl?: string;
  xmlUrl?: string;
  erro?: string;
}

export interface CancelarNFeResult {
  ok: boolean;
  erro?: string;
}

/** Mapeamento de códigos SEFAZ para mensagens amigáveis */
export const SEFAZ_CODIGOS: Record<string, string> = {
  "204": "Certificado digital inválido ou vencido",
  "205": "Certificado digital revogado",
  "280": "Data de vigência da UF do contribuinte inválida",
  "401": "Código da UF do emitente inválido",
  "402": "Código da UF do destinatário inválido",
  "539": "Rejeição: CNPJ do emitente não cadastrado",
  "589": "Rejeição: CNPJ do destinatário não cadastrado",
  "656": "Rejeição: NF-e já está cancelada",
  "573": "Rejeição: Cancelamento fora do prazo permitido (geralmente 24h após autorização)",
};

export function mensagemErroSefaz(codigo: string | number): string {
  const c = String(codigo);
  return SEFAZ_CODIGOS[c] || `Erro SEFAZ código ${c}`;
}

export async function consultarNFe(pedidoId: number): Promise<ConsultarNFeResult> {
  const provider = (process.env.NFE_PROVIDER || "").toLowerCase();
  if (provider === "test") {
    const { consultarNFeTest } = await import("./test-provider");
    return consultarNFeTest(pedidoId);
  }
  const configurado = !!(process.env.NFE_PROVIDER && process.env.NFE_API_TOKEN);
  if (!configurado) {
    return {
      status: "erro",
      erro: "Integração NF-e não configurada. Configure NFE_PROVIDER e NFE_API_TOKEN.",
    };
  }
  try {
    const { consultarNFeFocus } = await import("./focus-nfe");
    return consultarNFeFocus(pedidoId);
  } catch {
    return {
      status: "erro",
      erro: "Provedor NF-e não disponível. Use NFE_PROVIDER=test para testes.",
    };
  }
}

export async function cancelarNFe(
  pedidoId: number,
  motivo: string
): Promise<CancelarNFeResult> {
  const provider = (process.env.NFE_PROVIDER || "").toLowerCase();
  if (provider === "test") {
    const { cancelarNFeTest } = await import("./test-provider");
    return cancelarNFeTest(pedidoId, motivo);
  }
  const configurado = !!(process.env.NFE_PROVIDER && process.env.NFE_API_TOKEN);
  if (!configurado) {
    return {
      ok: false,
      erro: "Integração NF-e não configurada. Configure NFE_PROVIDER e NFE_API_TOKEN.",
    };
  }
  try {
    const { cancelarNFeFocus } = await import("./focus-nfe");
    return cancelarNFeFocus(pedidoId, motivo);
  } catch {
    return {
      ok: false,
      erro: "Provedor NF-e não disponível. Use NFE_PROVIDER=test para testes.",
    };
  }
}

export async function emitirNFe(payload: EmitirNFePayload): Promise<EmitirNFeResult> {
  const provider = (process.env.NFE_PROVIDER || "").toLowerCase();
  if (provider === "test") {
    const { emitirNFeTest } = await import("./test-provider");
    return emitirNFeTest(payload);
  }
  const configurado = !!(process.env.NFE_PROVIDER && process.env.NFE_API_TOKEN);
  if (!configurado) {
    return {
      ok: false,
      erro:
        "Integração NF-e não configurada. Configure NFE_PROVIDER e NFE_API_TOKEN. " +
        "Para testes, use NFE_PROVIDER=test. Provedores reais: NFe.io, Focus NFe, Webmania, Acras.",
    };
  }
  // TODO: chamar API do provedor conforme NFE_PROVIDER
  return {
    ok: false,
    erro: "Integração NF-e em desenvolvimento. Consulte a documentação do provedor.",
  };
}
