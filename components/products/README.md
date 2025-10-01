# Products Module

## Padrões de Confirmação e Toasts

Este módulo segue o mesmo padrão aplicado em `orders` e `entities`:

- Confirmações destrutivas ou de mudança de estado usam `<ConfirmDialog>`.
- Feedback de sucesso/erro usa `useToast()` (Provider global) com helpers.
- Erros padronizados utilizam `toastError(push, err, fallback?)` definido em `components/entities/shared/toast.js`.

### Convenções

| Ação                                 | Componente                                | Feedback Sucesso                   | Feedback Erro                                      |
| ------------------------------------ | ----------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| Inativar produto                     | `ProductsManager` (ConfirmDialog)         | "Produto inativado"                | toastError(..., 'Falha na operação')               |
| Reativar produto                     | `ProductsManager` (ConfirmDialog)         | "Produto reativado"                | toastError(..., 'Falha na operação')               |
| Hard delete                          | `ProductsManager` (ConfirmDialog + senha) | "Produto excluído definitivamente" | toastError(..., 'Erro ao excluir definitivamente') |
| Salvar (novo/editar)                 | `ProductForm` via `onSubmit`              | Fecha modal + refresh              | toastError(..., 'Erro ao salvar produto')          |
| Validação form (nome / fornecedores) | `ProductForm`                             | -                                  | push('Mensagem', { type: 'error' })                |

### Helper `toastError`

```
toastError(push, errorLike, fallbackMsg?)
```

- Aceita `Error`, string ou objeto genérico.
- Extrai `message|error|msg` ou usa fallback.
- Garante não lançar exceções se push falhar.

### Boas Práticas

1. Nunca usar `alert()` em fluxos de UI (substituído por toast).
2. Sempre fechar dialogs (ex.: toggle) após sucesso OU erro para evitar ficar travado.
3. Mensagens curtas, verbos no passado para sucesso ("inativado", "reativado").
4. Erros específicos do backend: tentar exibir texto retornado, caso vazio usar fallback.
5. Em operações críticas (hard delete) confirmar pré-condições antes de chamar API (ex.: senha).

## Estrutura Atual

- `ProductsManager`: Lista, filtros, modais de ações, ranking Top Produtos, toggles de ativo e hard delete.
- `ProductForm`: Criação/edição com exibição de campos derivativos (preço sugerido, estoque mínimo sugerido).
- `TopProdutosRanking`: Ranking (lucro) com navegação cruzada para filtro por ID.

## Próximos Passos Sugeridos

1. Cobrir hard delete com testes (fluxo senha inválida e sucesso).
2. Extrair sub-blocos muito grandes de `ProductsManager` (ex.: ranking modal, cost history chart) para reduzir complexidade cognitiva.
3. Reutilizar `toastError` também em `entities` e `orders` (onde ainda houver pattern manual).
4. Adicionar casos de acessibilidade (aria-live para container de toasts, opcional).
5. Avaliar paginação server-side se a lista crescer além de 500 produtos.

## Edição Direta via `?highlight=` (Novo)

`ProductsManager` agora suporta abrir diretamente o modal de edição quando a URL contém `?highlight=<id>`, usando o hook genérico `useHighlightEntityLoad`.

Fluxo:

1. Lê param da query.
2. Faz fetch de `/api/v1/produtos/:id` sem interferir na lista.
3. Ao sucesso, abre modal de edição pré-preenchido.

Estados de UI exibidos:

- `Carregando produto #<id>…` enquanto busca.
- Mensagem de erro em vermelho se falhar (sem quebrar a lista principal).

Motivação:

- Permitir deep-link de notificações ou dashboards para um produto específico.
- Alinhar comportamento com Pedidos e Entidades (padrão consistente).

Snippet do hook:

```js
const { highlighted, loadingHighlight, errorHighlight } =
  useHighlightEntityLoad({
    highlightId,
    fetcher: async (id) => {
      const res = await fetch(`/api/v1/produtos/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha");
      return json;
    },
  });
```

## Integração com Outros Módulos

Events de inventário (`inventory-changed`) disparam refresh automático se IDs impactados estiverem visíveis. Mensagens de toast não devem bloquear esse fluxo.

---

Mantendo estes padrões garantimos consistência de UX em toda a aplicação.
