# Padrão de Highlight e Paginação Unificada

Este documento descreve dois padrões recentes adotados para unificar comportamento entre módulos (Pedidos, Entidades e Produtos):

1. Paginação com metadados via `usePaginatedPedidos` (extensível a outros domínios).
2. Edição direta por deep-link usando o parâmetro de query `?highlight=<id>` através do hook genérico `useHighlightEntityLoad`.

---

## 1. Paginação com `usePaginatedPedidos`

Objetivo: substituir hooks legados específicos e duplicação de lógica de `offset/limit` por um hook único que:

- Monta query string com filtros + `limit` + `offset`.
- Solicita `meta=1` para respostas `{ data, meta: { total } }`.
- Mantém fallback para respostas antigas (array simples sem meta).
- Expõe API simples para navegação de páginas.

Assinatura:

```js
const {
  filters,
  setFilters,
  rows,
  loading,
  error,
  page,
  total,
  hasMore,
  nextPage,
  prevPage,
  gotoPage,
  reload,
  limit,
} = usePaginatedPedidos(initialFilters, limit);
```

Uso típico:

```js
const { rows, page, total, nextPage, loading } = usePaginatedPedidos(
  { tipo: "VENDA" },
  20,
);
```

Boas práticas:

- Resetar página automaticamente quando filtros mudam (interno ao hook).
- Exibir `total` quando disponível (evita paginação cega).
- Tratar `error` distinto de estado vazio para evitar falsa percepção de ausência de dados.

Extensão futura: extrair versão genérica `usePaginatedResource` se surgir segundo domínio com semântica idêntica.

---

## 2. Edição Direta via `?highlight=<id>`

Objetivo: permitir deep-links que abram diretamente a UI de edição de um registro sem exigir interação manual prévia (ex.: clicar em uma linha da tabela).

Hook central: `hooks/useHighlightEntityLoad.js`.

Assinatura:

```js
const {
  highlighted,     // dado carregado ou null
  loadingHighlight,
  errorHighlight,
  load,            // load(id) manual (casos avançados)
  clearHighlight,  // reset local
} = useHighlightEntityLoad({ highlightId, fetcher, autoLoad = true });
```

Parâmetros:

- `highlightId`: ID inicial (string|number) — normalmente extraído de `new URLSearchParams(location.search).get('highlight')`.
- `fetcher(id)`: função assíncrona que retorna o recurso (deve lançar erro em status não-ok).
- `autoLoad`: quando `true` (default) dispara busca automática ao montar se `highlightId` existir.

Fluxo típico no Manager:

```js
const highlightId =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("highlight")
    : null;

const { highlighted, loadingHighlight, errorHighlight } =
  useHighlightEntityLoad({
    highlightId,
    fetcher: async (id) => {
      const res = await fetch(`/api/v1/pedidos/${id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar");
      return json;
    },
  });

useEffect(() => {
  if (highlighted) {
    setEditing(highlighted);
    setShowForm(true);
  }
}, [highlighted]);
```

Estados de UI recomendados:

- `loadingHighlight`: exibir linha ou bloco "Carregando <entidade> #ID…".
- `errorHighlight`: mostrar mensagem em vermelho; NÃO impedir uso normal da lista.

Domínios atualmente suportando:

| Domínio   | Componente Manager                            | Observações                          |
| --------- | --------------------------------------------- | ------------------------------------ |
| Pedidos   | `components/orders/index.js`                  | Carrega e abre `PedidoForm`          |
| Entidades | `components/entities/form/EntitiesManager.js` | Abre `EntityFormShell` diretamente   |
| Produtos  | `components/products/manager.js`              | Abre modal de edição (`ProductForm`) |

---

## Motivações & Benefícios

- Navegação direta a partir de dashboards, relatórios ou notificações (ex.: toast com link).
- Reduz cliques e tempo até ação de edição.
- Padrão consistente melhora previsibilidade de UX.
- Hook isolado reduz duplicação de efeitos `useEffect` espalhados.

---

## Erros & Resiliência

- Falhas de rede ou 404 não bloqueiam a lista: apenas exibem `errorHighlight` (não modal).
- Evitar loops: hook só recarrega automaticamente quando `highlightId` muda.
- Se usuário fecha modal ou formulário após highlight, pode permanecer o param — opção futura: limpar param via `history.replaceState` ao fechar (não implementado ainda).

---

## Próximas Evoluções (Ideias)

- `usePaginatedResource` genérico para múltiplos domínios.
- Limpeza automática do parâmetro `highlight` ao concluir edição/salvar.
- Suporte a múltiplos IDs (ex.: `?highlight=1,2`) para seleção em massa futura.
- Pre-fetch em hover de links que apontam para `?highlight=ID` (melhora percepção de velocidade).
- Instrumentação: métricas de conversão (quantos highlights resultam em salvamento/edição confirmada).

---

Mantendo estes padrões, garantimos consistência, redução de duplicação e melhor experiência de navegação em registros específicos.
