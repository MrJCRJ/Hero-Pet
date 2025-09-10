# Estrutura do Sistema

## Tabelas Principais

### **Clientes**

```sql
clientes (
  _id,           -- ID único (ObjectId)
  nome,          -- Obrigatório
  documento,     -- CPF ou CNPJ (Obrigatório, único)
  cep,           -- Para buscar endereço automático
  numero,        -- Número do endereço
  complemento,   -- Complemento opcional
  telefone,
  email,
  ativo          -- Status do cliente (ativo/inativo)
)
```

### **Fornecedores**

```sql
fornecedores (
  _id,           -- ID único
  nome,          -- Razão Social (Obrigatório)
  cnpj,          -- Obrigatório, único
  telefone,
  email,
  cep,           -- Similar ao de clientes
  ativo          -- Status do fornecedor
)
```

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

## Pedidos

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

---

## Despesas

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
