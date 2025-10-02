// Utilitário de mock para hooks de Products em testes de integração
// Evita repetição em vários arquivos e remove dependência de debounce/fetch real.

export function mockProductsBase(productOverrides = {}) {
  jest.mock("components/products/hooks", () => ({
    useProducts: () => ({
      rows: [
        {
          id: 1,
          nome: "Produto Mock",
          categoria: "Teste",
          ativo: true,
          supplier_labels: [],
          preco_tabela: 100,
          ...productOverrides,
        },
      ],
      total: 1,
      loading: false,
      query: { q: "", categoria: "", ativo: "true" },
      setQ: jest.fn(),
      setCategoria: jest.fn(),
      setAtivo: jest.fn(),
      refresh: jest.fn(),
    }),
  }));

  jest.mock("components/products/useProductCosts", () => ({
    __esModule: true,
    default: () => ({
      costMap: {
        [productOverrides.id || 1]: {
          saldo: productOverrides.saldo ?? 10,
          custo_medio: productOverrides.custo_medio ?? 12.5,
          ultimo_custo: productOverrides.ultimo_custo ?? 11,
          min_hint: 5,
        },
      },
    }),
  }));
}
