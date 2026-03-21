/**
 * Gera URLs de gráficos via QuickChart (API pública) para inclusão em relatórios.
 * Se a requisição falhar, retorna null para não bloquear a geração do relatório.
 */

const QUICKCHART_BASE = "https://quickchart.io/chart";

function buildChartUrl(config: Record<string, unknown>, width = 500, height = 280): string {
  const encoded = encodeURIComponent(JSON.stringify(config));
  return `${QUICKCHART_BASE}?c=${encoded}&width=${width}&height=${height}`;
}

/** Retorna buffer da imagem do gráfico (ArrayBuffer) ou null em caso de falha. */
export async function fetchChartImage(url: string): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export interface EvolucaoMensalItem {
  mes: string;
  entradas: number;
  saidas: number;
  saldoPeriodo: number;
  saldoAcumulado: number;
}

/** Gera URL do gráfico de evolução do saldo de caixa (barras). */
export function getEvolucaoSaldoChartUrl(evolucao: EvolucaoMensalItem[]): string | null {
  if (evolucao.length === 0) return null;
  const config = {
    type: "bar",
    data: {
      labels: evolucao.map((e) => e.mes),
      datasets: [
        { label: "Saldo acumulado", data: evolucao.map((e) => e.saldoAcumulado), backgroundColor: "rgba(59,130,246,0.7)" },
      ],
    },
    options: {
      plugins: { title: { display: true, text: "Evolução do saldo de caixa acumulado" } },
      scales: { y: { beginAtZero: true } },
    },
  };
  return buildChartUrl(config, 520, 260);
}

export interface ParticipacaoItem {
  name: string;
  value: number;
}

/** Gera URL do gráfico de participação (pizza) - top produtos ou clientes. */
export function getParticipacaoChartUrl(
  itens: ParticipacaoItem[],
  titulo: string,
  maxItens = 8
): string | null {
  if (itens.length === 0) return null;
  const top = itens.slice(0, maxItens);
  const outros = itens.slice(maxItens).reduce((s, i) => s + i.value, 0);
  const labels = top.map((i) => (i.name.length > 18 ? i.name.slice(0, 15) + "..." : i.name));
  const data = top.map((i) => i.value);
  if (outros > 0) {
    labels.push("Outros");
    data.push(outros);
  }
  const config = {
    type: "pie",
    data: { labels, datasets: [{ data }] },
    options: {
      plugins: { title: { display: true, text: titulo } },
      legend: { position: "right" },
    },
  };
  return buildChartUrl(config, 480, 260);
}
