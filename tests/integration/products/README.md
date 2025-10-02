# Estratégia de Testes de Integração – Products

Este diretório contém testes de integração dos fluxos de Produtos que antes eram frágeis devido a:

1. Debounce + chamadas assíncronas em `useProducts` (paginação, filtros) causando timeouts intermitentes.
2. Cálculo de custos históricos (`useProductCosts`) disparando requisições adicionais e updates encadeados fora de `act()`.
3. Duplication de mocks entre testes, dificultando manutenção e introduzindo pequenas divergências de cenário.

## Objetivos da Refatoração

- Determinismo: remover dependência de temporizadores/debounce reais nos testes.
- Redução de warnings de `act()` sem recorrer a esperas arbitrárias (`setTimeout`, `waitFor` excessivo).
- Centralizar mocks de hooks para reduzir divergências e facilitar extensão futura.
- Possibilitar inspeção opcional (via flag de ambiente) de labels ausentes no gráfico de custos.

## Abordagem

### 1. Mock Centralizado dos Hooks

Arquivo: `__utils__/mockProductsHooks.js`

Fornece `mockProductsBase(overrides)` que registra mocks de:

- `useProducts` → retorna lista estática de linhas + estado `loading:false` (padrão) sem debounce.
- `useProductCosts` → retorna mapa de custos por produto com estrutura enxuta e previsível.

Cada teste chama `mockProductsBase({ rows:[...], costMap:{...} })` antes de renderizar o componente alvo, sobrescrevendo somente o necessário.

Benefícios:

- Evita repetição de `jest.mock(...)` em cada arquivo.
- Facilita futura adição de campos (basta alterar o util em um lugar).
- Remove dependência de timers → elimina flakiness.

### 2. `flushAsync` Helper

Arquivo: `tests/test-utils/flushAsync.js`

Executa microtasks dentro de `act()` repetidamente para drenar updates React enfileirados (promises resolvidas, state setters em effects). Usado somente onde a renderização inicial dispara pequenos encadeamentos (ex.: modais ou efeitos condicionais).

Padrão de uso:

```js
await flushAsync(); // após render se necessário
```

Evita dispersar `await waitFor(() => {})` sem asserções reais.

### 3. Console Debug Opcional

Logs de labels faltantes nos gráficos de custo agora só aparecem se `process.env.DEBUG_MISSING_LABELS` estiver definido (qualquer valor truthy). Isso mantém a suíte limpa por padrão.

Para ativar temporariamente:

```
DEBUG_MISSING_LABELS=1 npm test -- tests/integration/Products.costHistory.integration.test.js
```

### 4. Critério de Cobertura

Testes focam em:

- Abertura de modal de detalhes com dados esperados.
- Cálculo / exibição de métricas de variação mensal e acumulada (usando mapa de custos mockado).
- Interação mínima (cliques em linha de produto) garantindo que pipeline UI→hook→render funciona.

Não coberto (por desenho):

- Lógica interna de debounce real (já validada em testes de unidade/hook separados se necessário).
- Requisições HTTP reais de custos / produtos (substituídas por mocks determinísticos).

### 5. Extensão Futura

Quando adicionar novo cenário:

1. Estenda `mockProductsBase` se a forma de retorno do hook mudar.
2. Evite inserir `setTimeout`/`jest.advanceTimersByTime`: prefira estruturar mocks para estado final imediato.
3. Só use `flushAsync` se observar warnings de `act()` após a primeira ref render (inspecione o warning antes para não mascarar efeitos reais).
4. Para múltiplos produtos com diferentes históricos, adicione entradas ao `costMap` com chaves pelo `id` real usado nas linhas.

### 6. Troubleshooting Rápido

| Sintoma           | Provável Causa                                                 | Ação                                                      |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| Timeout no teste  | Hook não mockado / debounce ativo                              | Garantir chamada a `mockProductsBase` antes do render     |
| Warning de act()  | Efeito assíncrono pós-render não drenado                       | Inserir `await flushAsync()` logo após render             |
| Modal não abre    | Seleção de role/text incorreta ou mock sem `id` correspondente | Verificar `rows` passados e texto exato usado no `getBy*` |
| Métrica incorreta | `costMap` inconsistente com expectativa                        | Ajustar mapa no override local do teste                   |

### 7. Manutenção

Mudanças de assinatura em `useProducts` ou `useProductCosts` devem refletir primeiro no mock central. Depois atualizar testes se algum campo for exibido diretamente. Manter mocks minimalistas (somente campos que a UI realmente lê) para reduzir atrito.

---

Última atualização: (inserir data ao editar futuramente)
