# Estrutura do Sistema

## Tabelas Principais

### **Entities (Postgres)**

Tabela consolidada para cadastro genérico (substitui a separação conceitual inicial de clientes/fornecedores no fluxo atual da aplicação):

````sql
entities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  entity_type VARCHAR(2) NOT NULL,          -- 'PF' ou 'PJ'
  document_digits VARCHAR(14) NOT NULL DEFAULT '',
  document_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  document_pending BOOLEAN NOT NULL DEFAULT FALSE,
  cep TEXT,
  numero TEXT,
  complemento TEXT,
  telefone TEXT,
  email TEXT,
  # Estrutura do Sistema

  Este documento consolida o modelo de dados atual e as próximas tabelas priorizadas, alinhado ao fluxo de trabalho da aplicação.

  ## Tabelas Principais

  ### 1) Entities (Postgres)

  Tabela única para cadastro de pessoas (PF/PJ). Substitui a separação conceitual de clientes/fornecedores — o “perfil” é derivado de `entity_type` na UI.

  ```sql
  entities (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    entity_type VARCHAR(2) NOT NULL,          -- 'PF' ou 'PJ'
    document_digits VARCHAR(14) NOT NULL DEFAULT '',
    document_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    document_pending BOOLEAN NOT NULL DEFAULT FALSE,
    cep TEXT,
    numero TEXT,
    complemento TEXT,
    telefone TEXT,
    email TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
  );
````

Índices relevantes:

```sql
CREATE INDEX entities_document_status_index ON entities(document_status);
CREATE INDEX entities_document_pending_index ON entities(document_pending);
CREATE INDEX entities_entity_type_index ON entities(entity_type);
CREATE INDEX entities_created_at_index ON entities(created_at);
CREATE INDEX entities_ativo_index ON entities(ativo);
CREATE UNIQUE INDEX uniq_entities_document_digits_not_empty ON entities(document_digits) WHERE document_digits <> '';
```

Regras compartilhadas (frontend/backend):

- `document_status`: calculado server-side a partir de `document_digits` + `document_pending` (pending | provisional | valid).
- Endereço: completo se `cep` e `numero` presentes; parcial se um deles; vazio caso contrário.
- Contato: completo se telefone válido (fixo ou celular) E e-mail válido; parcial se qualquer um preenchido; vazio caso contrário.

---

### 2) Produtos (novo modelo)

Objetivo: reduzir atrito de cadastro, calcular custo por movimentos e permitir preço sugerido.

Decisões:

- Não persistir “preco_custo” fixo no produto. O custo é derivado dos movimentos (entradas) — incluindo frete e outras despesas.
- “preco_tabela” é opcional (preço padrão manual). Também guardamos um `markup_percent_default` opcional para sugerir preço sobre o custo médio.
- `fornecedor_id` referencia `entities(id)` (preferencialmente PJ), selecionado via autocomplete.
- `codigo_barras` é opcional e único quando preenchido (unique parcial).
- `estoque_minimo` é opcional; a UI pode exibir sugestão baseada na média de vendas.
- `estoque_atual` NÃO é persistido — é derivado dos movimentos.

Schema sugerido:

```sql
produtos (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  codigo_barras TEXT,                          -- opcional; unique quando não nulo
  categoria TEXT,
  fornecedor_id INTEGER REFERENCES entities(id) ON DELETE SET NULL,
  preco_tabela NUMERIC(12,2),                  -- opcional
  markup_percent_default NUMERIC(5,2),         -- ex.: 30.00 = 30% (opcional)
  estoque_minimo NUMERIC(12,3),                -- opcional
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Índices úteis
CREATE UNIQUE INDEX produtos_codigo_barras_uniq_not_null ON produtos(codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE INDEX produtos_nome_idx ON produtos (nome);
CREATE INDEX produtos_ativo_idx ON produtos (ativo);
```

---

### 3) Movimento de Estoque (fonte da verdade)

Cada entrada/saída/ajuste atualiza o saldo e compõe o custo. Frete e despesas entram na conta do custo médio.

```sql
movimento_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo VARCHAR(10) NOT NULL,                   -- 'ENTRADA' | 'SAIDA' | 'AJUSTE'
  quantidade NUMERIC(12,3) NOT NULL,
  valor_unitario NUMERIC(12,2),               -- base por unidade (para ENTRADA)
  frete NUMERIC(12,2) DEFAULT 0,
  outras_despesas NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(14,2) NOT NULL,         -- recomendação: qtd*valor_unitario + frete + outras_despesas
  documento TEXT,
  observacao TEXT,
  data_movimento timestamptz NOT NULL DEFAULT NOW(),
  usuario TEXT
);

CREATE INDEX movimento_estoque_produto_dt_idx ON movimento_estoque (produto_id, data_movimento DESC);
```

Views/Agrupadores (opcional, podem ser endpoints que calculam):

- Saldo por produto: `SUM(entradas) - SUM(saidas) + SUM(ajustes)`.
- Custo médio: `SUM(valor_total ENTRADA) / SUM(qtd ENTRADA)`.
- Último custo: último `valor_total/qtd` de ENTRADA.

---

## Regras de Custo e Preço

- Custo médio ponderado: calculado a partir de ENTRADAS (incluindo frete/despesas).
- Preço sugerido: `custo_medio * (1 + markup_percent_default/100)` quando ambos existirem; apresentamos na UI como sugestão.
- Descontos: aplicados por item no pedido (não alteram o preço padrão do produto).

## Fornecedor (autocomplete)

- `fornecedor_id` selecionado via busca em `/api/v1/entities?entity_type=PJ&q=<texto>` (ILIKE em `name` e/ou filtro por `document_digits`).
- O servidor pode validar que o fornecedor selecionado é PJ.

## Estoque Mínimo

- Campo `estoque_minimo` opcional.
- Sugestão na UI: média mensal de vendas (ex.: últimos 90 dias) para orientar o valor a ser salvo.

---

## Endpoints (backlog)

- Produtos:
  - `POST /api/v1/produtos` (criar)
  - `GET /api/v1/produtos` (filtros: nome, código de barras, categoria, ativo)
  - `PUT /api/v1/produtos/:id` (atualizar)
  - `DELETE /api/v1/produtos/:id` (inativar ou excluir)
- Estoque:
  - `POST /api/v1/estoque/movimentos` (entrada/saída/ajuste)
  - `GET /api/v1/estoque/movimentos?produto_id=...`
  - `GET /api/v1/estoque/saldos?produto_id=...` (saldo, custo médio, último custo)
- Fornecedores (autocomplete):
  - `GET /api/v1/entities?entity_type=PJ&q=<texto>`

---

## Migrações & Erros de Schema

- Migrações ficam em `infra/migrations/` e devem ser aplicadas antes do uso em produção.
- Erros de Postgres tratados pelos endpoints:
  - `42P01`: tabela ausente.
  - `42703`: coluna ausente.
  - Nestes casos, resposta 503 orienta executar `POST /api/v1/migrations`.

---

## Testes Planejados (próximo passo)

1. Produtos

- POST cria produto (sem fornecedor, com fornecedor PJ válido, com código de barras opcional).
- GET lista por nome/código/categoria/ativo.
- Unique parcial de `codigo_barras` (não permite duplicado quando não nulo).

2. Movimentos

- ENTRADA registra custo e aumenta saldo.
- SAÍDA reduz saldo, não altera custo médio (regra simples inicial).
- AJUSTE altera saldo conforme sinal.
- Endpoint de saldos retorna `saldo`, `custo_medio`, `ultimo_custo` consistentes após uma sequência de movimentos.

3. Fornecedor (autocomplete)

- Busca por `q` retorna apenas PJ, filtrando por nome (ILIKE) e/ou por parte do documento.

4. Sugestões (UI)

- Preço sugerido com markup quando existir custo médio.
- Sugestão de `estoque_minimo` (média dos últimos 90 dias) exibida sem persistência automática.

---

Notas

- Podemos adicionar Unidade/Peso futuramente sem quebrar compatibilidade (nova migração independente).
- Caso deseje FIFO/PEPS no custo, isso será uma evolução (maior complexidade). O custo médio ponderado atende bem a maioria dos cenários no início.
