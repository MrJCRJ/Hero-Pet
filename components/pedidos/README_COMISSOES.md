# Relatório de Comissões de Vendas

Esta funcionalidade permite gerar um relatório em PDF com as comissões de vendas de rações por período.

## Funcionalidades

### Frontend

#### Botão de Comissões

- Localizado na página de listagem de pedidos, ao lado do botão "Adicionar"
- Abre um modal para seleção do período desejado

#### Modal de Seleção de Período

**Componente:** `components/pedidos/ComissoesModal.js`

Permite selecionar:

- **Mês:** Janeiro a Dezembro
- **Ano:** Do ano atual até 2020

Informações exibidas no modal:

- Todas as rações vendidas no período serão incluídas
- Total de vendas
- Comissão de 3%
- Comissão de 5%

### Backend

#### Endpoint

**GET** `/api/v1/pedidos/comissoes-vendas`

**Query Parameters:**

- `mes` (opcional): Número do mês (1-12). Padrão: mês atual
- `ano` (opcional): Ano (ex: 2024). Padrão: ano atual

**Exemplo de Uso:**

```bash
GET /api/v1/pedidos/comissoes-vendas?mes=10&ano=2024
```

**Resposta:**
Retorna um arquivo PDF para download com o relatório de comissões.

### Lógica de Negócio

O relatório considera:

- **Tipo de Pedido:** Apenas vendas (`tipo = 'VENDA'`)
- **Status:** Apenas pedidos confirmados (`status = 'confirmado'`)
- **Categoria de Produtos:** Apenas produtos das categorias: `Cachorro`, `Gato`, `Passaros`
- **Período:** Baseado na `data_emissao` dos pedidos

#### Estrutura do Relatório

O relatório PDF contém **3 seções principais**:

1. **Pedidos do Mês**
   - Lista todos os pedidos de venda confirmados
   - Mostra: ID do pedido, Data, Cliente e Valor Total
   - Ordenado por data (mais recente primeiro)

2. **Produtos Vendidos**
   - Agregação de todos os produtos vendidos
   - Mostra: Nome do produto, Quantidade total, Valor total
   - Ordenado por valor total (maior para menor)

3. **Clientes e Compras**
   - Lista de todos os clientes que compraram no período
   - Mostra: Nome do cliente e Total de compras
   - Ordenado por valor total de compras (maior para menor)

#### Cálculos

1. **Agregação por Pedido:** Soma dos valores de todos os itens do pedido

2. **Agregação por Produto:**
   - Quantidade total vendida de cada produto
   - Valor total (soma de `total_item` de todos os itens do produto)

3. **Agregação por Cliente:**
   - Total de compras de cada cliente no período

4. **Total Geral:**
   - Soma do valor total de todos os produtos das categorias selecionadas

5. **Comissões:**
   - **Comissão 3%:** `total_geral * 0.03`
   - **Comissão 5%:** `total_geral * 0.05`

### Estrutura do PDF

O PDF gerado contém:

#### Cabeçalho

- Título: "Relatório de Comissões de Vendas"
- Período: Mês e ano selecionados
- Data de geração

#### 1. Pedidos do Mês

Tabela com todos os pedidos confirmados, incluindo:

- Número do pedido (#ID)
- Data de emissão
- Nome do cliente
- Valor total do pedido

#### 2. Produtos Vendidos

Tabela de produtos agregados com:

- Nome do produto
- Quantidade total vendida
- Valor total de vendas

Ordenados por valor total (do maior para o menor)

#### 3. Clientes e Compras

Tabela de clientes com:

- Nome do cliente
- Total comprado no período

Ordenados por valor de compras (do maior para o menor)

#### Resumo de Comissões

- Total de vendas de rações/alimentos
- Comissão de 3% (em verde)
- Comissão de 5% (em azul)

#### Rodapé

Nota explicativa: "Este relatório considera apenas pedidos de venda confirmados com produtos das categorias: Cachorro, Gato e Pássaros."

### Exemplo de Integração

```javascript
// Abrir relatório do mês atual
window.open("/api/v1/pedidos/comissoes-vendas", "_blank");

// Abrir relatório de período específico
const mes = 10; // Outubro
const ano = 2024;
window.open(`/api/v1/pedidos/comissoes-vendas?mes=${mes}&ano=${ano}`, "_blank");
```

## Arquivos Relacionados

- **API:** `pages/api/v1/pedidos/comissoes-vendas.js`
- **Modal:** `components/pedidos/ComissoesModal.js`
- **Listagem:** `components/pedidos/list/PedidoListManager.js`

## Requisitos

- PDFKit (já instalado no projeto)
- Acesso ao banco de dados com as tabelas:
  - `pedidos`
  - `pedido_itens`
  - `produtos`
  - `entities`

## Tratamento de Erros

A API retorna erros apropriados para:

- Mês inválido (fora do range 1-12)
- Ano inválido
- Problemas de conexão com banco de dados
- Schema não migrado

## Melhorias Futuras

- Filtro por vendedor específico
- Filtro por categoria de produto personalizável
- Exportação em outros formatos (Excel, CSV)
- Agrupamento por vendedor
- Comparativo entre períodos
- Gráficos de evolução de comissões
