# Estrutura do Sistema

## Tabelas Principais

### **Entities (Postgres)**

Tabela consolidada para cadastro genérico (substitui a separação conceitual inicial de clientes/fornecedores no fluxo atual da aplicação):

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
```

Índices relevantes:

```sql
CREATE INDEX entities_document_status_index ON entities(document_status);
CREATE INDEX entities_document_pending_index ON entities(document_pending);
CREATE INDEX entities_entity_type_index ON entities(entity_type);
CREATE INDEX entities_created_at_index ON entities(created_at);
CREATE INDEX entities_ativo_index ON entities(ativo);
CREATE UNIQUE INDEX uniq_entities_document_digits_not_empty ON entities(document_digits) WHERE document_digits <> '';
```

#### Regras de Classificação

- `document_status`: calculado server-side a partir de `document_digits` + flag `document_pending` (pending | provisional | valid).
- Completude de endereço: completo se `cep` e `numero` presentes; parcial se um deles; vazio caso contrário.
- Completude de contato: completo se telefone válido (fixo 10 ou celular 11 com 9) E email válido; parcial se qualquer um preenchido; vazio caso contrário.

#### Migrações & Erros de Schema

- Migrações residem em `infra/migrations/` e devem ser aplicadas em produção antes de endpoints dependerem das colunas novas.
- Erro `42P01` (tabela ausente) ou `42703` (coluna ausente) fará os endpoints retornarem 503 com instrução para executar `POST /api/v1/migrations`.
- Pipeline recomendado: detectar diff em `infra/migrations/` → aplicar → deploy → smoke tests.

---

### **Produtos**

```sql
produtos (
  _id,           -- ID único
  nome,          -- Obrigatório
  descricao,
  codigoBarras,  -- Para controle de estoque
  precoCusto,    -- Preço de compra
  precoVenda,    -- Preço de venda
  margemLucro,   -- % de lucro (calculado)
  categoria,     -- Rações cães, gatos, etc.
  fornecedor_id, -- Relacionamento
  unidadeMedida, -- Kg, Unidade, etc.
  peso,          -- Peso por unidade
  estoqueMinimo, -- Alertas de reposição
  estoqueAtual,
  ativo,
  dataCadastro
)
```

#### Fluxo de Trabalho (Produtos)

1. Cadastro de produto via formulário.
2. Validação dos campos obrigatórios.
3. Cálculo automático da margem de lucro.
4. Salvamento no banco de dados.
5. Atualização de estoque conforme entradas/saídas.
6. Alertas automáticos se estoque baixo.

#### **Exemplo de Produto**

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

---

#### Lógica do Sistema

#### 1. Cálculo Automático da Margem de Lucro

```javascript
margemLucro = ((precoVenda - precoCusto) / precoCusto) * 100;
// Exemplo: ((120 - 85) / 85) * 100 = 41.18%
```

#### 2. Controle de Estoque em Tempo Real

- **Entrada**: Compra do fornecedor
- **Saída**: Venda para clientes
- **Ajuste**: Inventário, perda ou avaria

#### 3. Alertas Automáticos

- Se `estoqueAtual <= estoqueMinimo`
- Exemplo:
  > "Alerta: Ração Premium está com apenas 8 unidades!"

---

#### Fluxo de Trabalho

#### **1. Cadastro de Novo Produto**

```text
[Formulário] → [Validação] → [Cálculo margem] → [Salvar no BD] → [Confirmação]
```

#### **2. Atualização de Estoque (Entrada)**

```text
[Compra do fornecedor] → [Nota fiscal] → [Atualizar estoqueAtual] → [Registrar movimento]
```

#### **3. Venda para Cliente (Saída)**

```text
[Pedido de venda] → [Baixa no estoque] → [Verificar estoque mínimo] → [Alertas se necessário]
```

#### **4. Reajuste de Preços**

```text
[Alteração no precoCusto] → [Recalcular precoVenda] → [Atualizar margemLucro]
```

---

#### Exemplo Completo

- Compra inicial: 50 unidades
- Venda de 45 → estoqueAtual = **5** (abaixo do mínimo 10)
- Sistema emite alerta
- Nova compra de 30 → estoqueAtual = **35**
- Alerta resolvido ✅

---

#### Tabelas Auxiliares

#### **Movimento de Estoque**

```sql
movimento_estoque (
  _id,
  produto_id,
  tipo,           -- 'ENTRADA', 'SAIDA', 'AJUSTE'
  quantidade,
  valor_unitario,
  documento,      -- Nº nota fiscal, pedido, etc.
  observacao,
  data_movimento,
  usuario
)
```

#### Fluxo de Trabalho (Movimento de Estoque)

1. Registro de entrada (compra), saída (venda) ou ajuste (inventário).
2. Atualização do estoque do produto relacionado.
3. Registro do movimento com usuário e documento.

#### Exemplo de Movimento

```json
{
  "produto_id": "abc123",
  "tipo": "ENTRADA",
  "quantidade": 30,
  "valor_unitario": 85.0,
  "documento": "NF12345",
  "observacao": "Compra mensal",
  "data_movimento": "2025-09-14",
  "usuario": "admin"
}
```

#### **Categorias de Produtos**

```sql
categorias_produtos (
  _id,
  nome,       -- 'Cães', 'Gatos', 'Aves', 'Medicamentos'
  descricao
)
```

---

#### Melhorias Sugeridas

- Código interno além do código de barras (ex: `RACAO-CAES-001`)
- Múltiplos fornecedores por produto
- Histórico de preços
- Controle de validade para perecíveis

---

### **Pedidos**

### **Pedidos**

```sql
pedidos (
  _id,
  tipo,                   -- 'VENDA', 'COMPRA'
  status,                 -- 'PENDENTE', 'PAGO', 'CANCELADO', 'ENTREGUE', 'FATURADO'
  cliente_id,
  fornecedor_id,
  documentoCliente,
  nomeCliente,

  -- DATAS IMPORTANTES
  dataPedido,
  dataFaturamento,        -- Quando emitiu NF
  dataEntrega,
  dataPagamento,

  -- VALORES (Calculados automaticamente)
  totalProdutos,          -- Soma dos itens
  desconto,               -- Desconto comercial
  valorFrete,             -- Custo do frete
  outrasDespesas,         -- Outros custos (embalagem, etc)
  totalPedido,            -- totalProdutos - desconto + valorFrete + outrasDespesas

  -- INFORMAÇÕES DE FRETE
  tipoFrete,              -- 'CIF', 'FOB', 'RETIRADA'
  transportadora,
  codigoRastreamento,
  prazoEntrega,

  -- CONTROLE FINANCEIRO
  formaPagamento,         -- 'DINHEIRO', 'CARTAO', 'PIX', 'BOLETO'
  parcelado,              -- Boolean
  numeroParcelas,

  -- CONTROLE FISCAL
  temNotaFiscal,
  numeroNotaFiscal,
  serieNotaFiscal,

  observacoes,
  vendedor,
  createdAt,
  updatedAt
)
```

#### Fluxo de Trabalho (Pedidos)

1. Criação de pedido de venda ou compra.
2. Adição de itens ao pedido.
3. Cálculo automático de totais, descontos e frete.
4. Definição de status (pendente, pago, entregue, etc).
5. Geração de parcelas se parcelado.
6. Atualização do estoque (baixa ou entrada).

#### Exemplo de Pedido

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

### **Itens do Pedido**

```sql
pedido_itens (
  _id,
  pedido_id,     -- Relacionamento
  produto_id,    -- Relacionamento
  nomeProduto,   -- Backup
  quantidade,
  precoUnitario,
  totalItem,     -- quantidade * precoUnitario
  descontoItem
)
```

#### Fluxo de Trabalho (Itens do Pedido)

1. Adição de itens ao pedido (produto, quantidade, preço).
2. Cálculo do total de cada item.
3. Atualização do estoque do produto ao finalizar pedido.

#### Exemplo de Item do Pedido

```json
{
  "pedido_id": "ped123",
  "produto_id": "prod456",
  "nomeProduto": "Ração Premium",
  "quantidade": 2,
  "precoUnitario": 120.0,
  "totalItem": 240.0,
  "descontoItem": 0
}
```

### **Parcelas**

```sql
parcelas (
  _id,
  pedido_id,
  numeroParcela,
  valorParcela,
  dataVencimento,
  dataPagamento,
  status,         -- 'PENDENTE', 'PAGO', 'ATRASADO'
  formaPagamento
)
```

#### Fluxo de Trabalho (Parcelas)

1. Geração automática das parcelas ao criar pedido parcelado.
2. Controle de status (pendente, pago, atrasado).
3. Registro de pagamento e atualização de status.

#### Exemplo de Parcela

```json
{
  "pedido_id": "ped123",
  "numeroParcela": 1,
  "valorParcela": 122.5,
  "dataVencimento": "2025-10-14",
  "dataPagamento": null,
  "status": "PENDENTE",
  "formaPagamento": "PIX"
}
```

---

### **Despesas**

```sql
despesas (
  _id,
  tipo,            -- 'FIXA', 'VARIAVEL', 'OCASIONAL'
  descricao,       -- Obrigatório
  categoria,       -- 'ALUGUEL', 'ENERGIA', 'AGUA', 'FUNCIONARIO', etc.
  valor,
  dataVencimento,
  dataPagamento,
  status,          -- 'PENDENTE', 'PAGO', 'ATRASADO'
  observacoes,
  formaPagamento,
  recorrente,      -- Boolean
  numeroParcelas,
  fornecedor_id    -- Relacionamento (se aplicável)
)
```

#### Fluxo de Trabalho (Despesas)

1. Cadastro de despesa fixa, variável ou ocasional.
2. Definição de categoria, valor, vencimento e recorrência.
3. Controle de status (pendente, pago, atrasado).
4. Registro de pagamento e atualização de status.

#### Exemplo de Despesa

```json
{
  "tipo": "FIXA",
  "descricao": "Aluguel Loja",
  "categoria": "ALUGUEL",
  "valor": 2500.0,
  "dataVencimento": "2025-09-30",
  "status": "PENDENTE",
  "recorrente": true,
  "numeroParcelas": 0,
  "fornecedor_id": "forn789"
}
```
