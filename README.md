# Hero-Pet

Hero-Pet é um sistema para gestão de estoque e financeiro, desenvolvido em JavaScript/Node.js com Next.js e TailwindCSS. O projeto visa facilitar o controle de clientes, pedidos, fornecedores e administração, com uma interface moderna e responsiva.

## Funcionalidades

- Cadastro e gerenciamento de clientes, pedidos e fornecedores
- Controle de acesso administrativo
- Visualização de status e navegação temática
- API RESTful para operações de migração e status
- Testes automatizados com Jest
- Integração com banco de dados via scripts e migrações

## Tecnologias Utilizadas

- **Next.js**: Framework React para aplicações web
- **TailwindCSS**: Estilização moderna e utilitária
- **Jest**: Testes automatizados
- **Docker Compose**: Orquestração de infraestrutura
- **Node.js**: Backend e scripts

### Gestão de Entidades (Novo Fluxo)

O fluxo de Cliente / Fornecedor foi unificado no componente `EntitiesManager` que provê:

- Formulário único para criação/edição (cliente ou fornecedor) com campos: documento (CPF/CNPJ) + pendência, endereço (CEP, número, complemento), contato (telefone, email), status ativo.
- Máscaras dinâmicas (CPF/CNPJ, CEP, telefone) centralizadas em util compartilhado.
- Classificação de documento: `pending | provisional | valid` (soft validation sem bloquear envio).
- Classificação de completude de endereço e contato: `completo | parcial | vazio` com ícone ⚠ em linhas parciais.
- Filtros combináveis: status do documento, pendente, completude de endereço e contato.
- Paginação incremental com botão "Carregar mais".
- Exclusão otimista com modal de confirmação e suporte a ESC.
- Resumo agregado (counts + percentuais) vindo de `/api/v1/entities/summary` exibido como badges.

O antigo `components/EntityForm.js` foi descontinuado e o arquivo removido. Utilize sempre `EntitiesManager`.

#### Percentuais de Completude

O endpoint `GET /api/v1/entities/summary` fornece:

```json
{
  "by_address_fill": { "completo": 3, "parcial": 1, "vazio": 6 },
  "percent_address_fill": { "completo": 30.0, "parcial": 10.0, "vazio": 60.0 },
  "by_contact_fill": { "completo": 5, "parcial": 2, "vazio": 3 },
  "percent_contact_fill": { "completo": 50.0, "parcial": 20.0, "vazio": 30.0 }
}
```

As chaves são sempre retornadas (zero-filled) para contrato estável de UI.

#### Regras de Completude

- Endereço completo: CEP preenchido + número preenchido.
- Endereço parcial: Pelo menos um dos dois (CEP ou número) preenchido.
- Contato completo: Telefone válido (fixo 10 dígitos ou celular 11 iniciando com 9) E email válido.
- Contato parcial: Pelo menos um dos campos contato preenchido (mesmo inválido ou incompleto).
- Caso contrário: `vazio`.

Regex e trechos SQL para telefone/email centralizados em `lib/validation/patterns.js` para evitar divergência.

### Utilitários de UI (Tailwind Plugin)

O projeto inclui um plugin Tailwind customizado (`tailwind-plugins/ui.js`) que disponibiliza classes semânticas:

- Botões: `btn`, `btn-primary`, `btn-secondary`, `btn-danger`, `btn-outline`, modificadores `btn-sm`, `btn-lg`, `btn-block`.
- Estado de carregamento: adicionar prop `loading` no componente `<Button />` aplica spinner e classe `btn-loading` (desabilita clique e mostra indicador). Ex:
  ```jsx
  <Button variant="primary" loading>
    Salvando...
  </Button>
  ```
- Badges: `badge`, `badge-soft`, `badge-success`, `badge-warning`, `badge-info`, `badge-danger`.
- Superfícies: `card`, `surface`, `divider`.

Isso reduz CSS manual em `globals.css` e centraliza consistência visual.

### Hook de Paginação (`usePaginatedEntities`)

O hook `usePaginatedEntities` (arquivo `hooks/usePaginatedEntities.js`) abstrai filtros e paginação incremental de entidades.

API retornada:

- `rows`, `total`, `summary`
- Estados: `loading`, `loadingMore`, `error`, `statusFilter`, `pendingOnly`, `canLoadMore`
- Ações: `setStatusFilter(v)`, `setPendingOnly(bool)`, `loadMore()`, `refresh()`, `loadSummary()`

Exemplo:

```jsx
import { usePaginatedEntities } from "hooks/usePaginatedEntities";

function EntitiesWidget() {
  const {
    rows,
    total,
    loading,
    canLoadMore,
    loadMore,
    statusFilter,
    setStatusFilter,
  } = usePaginatedEntities();
  return (
    <div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="">Todos</option>
        <option value="pending">Pending</option>
        <option value="provisional">Provisional</option>
        <option value="valid">Valid</option>
      </select>
      <ul>
        {rows.map((r) => (
          <li key={r.id}>{r.name}</li>
        ))}
      </ul>
      {canLoadMore && (
        <button onClick={loadMore} disabled={loading}>
          Carregar mais
        </button>
      )}
      <p>Total filtrado: {total}</p>
    </div>
  );
}
```

## Estrutura Principal

- `components/`: Componentes React reutilizáveis (formulários, navegação, UI)
- `contexts/`: Contextos globais (ex: tema)
- `hooks/`: Hooks customizados
- `infra/`: Infraestrutura, banco de dados, scripts e migrações
- `pages/`: Páginas da aplicação e rotas de API
- `tests/`: Testes automatizados
- `components/entities/`: Novo agrupamento (form, listagem, shared utils) do fluxo de entidades (substitui o antigo `EntityForm`).

## Como rodar o projeto

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure o ambiente (`.env.development`)
3. Suba a infraestrutura (opcional):
   ```bash
   docker compose -f infra/compose.yaml up
   ```
4. Rode a aplicação:
   ```bash
   npm run dev
   ```
5. Execute os testes:
   ```bash
   npm test
   ```

### Build e Produção

Para gerar build otimizado e iniciar em modo produção:

```bash
npm run build
npm start
```

Certifique-se de ter as variáveis de ambiente de produção definidas (ex: `DATABASE_URL`). O script `start` não sobe containers ou executa migrações automaticamente; recomenda-se aplicar migrações via pipeline (CI/CD) antes do deploy.

## Migrações de Banco & Erros de Schema

As migrações ficam em `infra/migrations/` e são aplicadas em ordem pelo endpoint `POST /api/v1/migrations` ou por execução direta em pipeline CI/CD. Cada arquivo representa uma mudança atômica no schema.

### Quando preciso aplicar?

- Sempre que novos arquivos forem adicionados em `infra/migrations/` no merge para `main` / produção.
- Se não houver arquivos novos, não é necessário rodar nada; o schema já está alinhado.

### Erros Comuns

| Código | Significado                                     | Tratamento                                         | Ação Sugerida                   |
| ------ | ----------------------------------------------- | -------------------------------------------------- | ------------------------------- |
| 42P01  | Tabela ausente (`entities` ainda não criada)    | API retorna 503 com mensagem de schema não migrado | Rodar `POST /api/v1/migrations` |
| 42703  | Coluna ausente (ex: `numero` após nova release) | API retorna 503 indicando schema desatualizado     | Aplicar migrações pendentes     |

O backend detecta ambos e responde 503 com payload orientando aplicar migrações:

```json
{
  "error": "Schema not migrated or outdated (table/column missing)",
  "dependency": "database",
  "code": "42703",
  "action": "Run POST /api/v1/migrations to apply pending migrations"
}
```

### Fluxo Recomendado em CI/CD

1. Rodar testes (garante consistência lógica).
2. Detectar mudanças em `infra/migrations/` comparando com commit anterior.
3. Se houver diffs, aplicar migrações no banco de produção (job dedicado, com lock se necessário).
4. Fazer deploy da aplicação.
5. Executar smoke tests (`/api/v1/status`, `/api/v1/entities/summary`).

### Endpoint de Migrações (Uso Manual)

```bash
curl -X POST https://<host>/api/v1/migrations
```

Idealmente proteger com token (ex: header `Authorization`) antes de expor publicamente em produção.

### Boas Práticas de Migração

- Prefira mudanças aditivas (adicionar coluna) em vez de DROP imediato.
- Para renomear/remover colunas: criar nova coluna, backfill, atualizar código, depois remover a antiga em uma migração posterior.
- Índices pesados: avaliar execução fora de horário de pico ou usar `CONCURRENTLY` (se adotado no futuro via ferramenta apropriada).
- Evite lógica demorada dentro da migração (backfills grandes podem ser scripts separados em batches).

### Observabilidade

Planejado: expor no `/api/v1/status` a última migração aplicada para auditoria rápida.

## Licença

MIT

---

## Exemplos de Entidades

### Cliente

```json
{
  "nome": "João da Silva",
  "documento": "123.456.789-00",
  "cep": "12345-678",
  "telefone": "(11) 99999-8888",
  "email": "joao@email.com",
  "ativo": true
}
```

### Produto

```json
{
  "nome": "Ração Premium para Cães Adultos",
  "descricao": "Ração super premium para cães adultos de porte médio",
  "codigoBarras": "7891234567890",
  "precoCusto": 85.0,
  "precoVenda": 120.0,
  "categoria": "Cães",
  "fornecedor_id": "abc123",
  "unidadeMedida": "Kg",
  "peso": 15,
  "estoqueMinimo": 10,
  "estoqueAtual": 50,
  "ativo": true
}
```

### Pedido

```json
{
  "tipo": "VENDA",
  "status": "PENDENTE",
  "cliente_id": "cli123",
  "dataPedido": "2025-09-14",
  "totalProdutos": 240.0,
  "desconto": 10.0,
  "valorFrete": 15.0,
  "totalPedido": 245.0
}
```

---

## Fluxo de Trabalho Típico

1. **Cadastro de Produto**: Usuário preenche formulário, sistema valida e calcula margem de lucro automaticamente.
2. **Entrada de Estoque**: Compra registrada, estoque atualizado, movimento salvo.
3. **Venda**: Pedido criado, estoque baixado, sistema verifica estoque mínimo e emite alerta se necessário.
4. **Reajuste de Preço**: Alteração no custo recalcula preço de venda e margem.

### Exemplo de Alerta

> "Alerta: Ração Premium está com apenas 8 unidades!"

---

## Lógica de Margem de Lucro

```js
margemLucro = ((precoVenda - precoCusto) / precoCusto) * 100;
// Exemplo: ((120 - 85) / 85) * 100 = 41.18%
```

---

## Mais detalhes

Consulte o arquivo [`sistema-estoque-financeiro.md`](./sistema-estoque-financeiro.md) para estrutura de tabelas, exemplos completos e lógica detalhada do sistema.
