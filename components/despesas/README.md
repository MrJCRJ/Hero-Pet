# Módulo de Despesas

Sistema completo para gerenciamento de despesas operacionais.

## Funcionalidades

### Backend (API)

#### Endpoints

- **GET /api/v1/despesas** - Lista todas as despesas com paginação e filtros
  - Query params:
    - `categoria`: Filtra por categoria
    - `status`: Filtra por status (pendente, pago, cancelado)
    - `mes`: Filtra por mês
    - `ano`: Filtra por ano
    - `fornecedor_id`: Filtra por fornecedor
    - `page`: Número da página (padrão: 1)
    - `limit`: Itens por página (padrão: 50)

- **POST /api/v1/despesas** - Cria nova despesa
  - Body:
    ```json
    {
      "descricao": "Descrição da despesa",
      "categoria": "aluguel|energia|agua|internet|telefone|salarios|tributos|marketing|manutencao|transporte|alimentacao|material_escritorio|outros",
      "valor": 1500.0,
      "data_vencimento": "2025-01-10",
      "data_pagamento": "2025-01-08",
      "status": "pendente|pago|cancelado",
      "fornecedor_id": 1,
      "observacao": "Observações adicionais"
    }
    ```

- **GET /api/v1/despesas/:id** - Retorna uma despesa específica
- **PUT /api/v1/despesas/:id** - Atualiza uma despesa
- **DELETE /api/v1/despesas/:id** - Remove uma despesa

#### Categorias Disponíveis

- Aluguel
- Energia
- Água
- Internet
- Telefone
- Salários
- Tributos
- Marketing
- Manutenção
- Transporte
- Alimentação
- Material de Escritório
- Outros

#### Status

- **pendente**: Despesa não paga
- **pago**: Despesa paga
- **cancelado**: Despesa cancelada

### Frontend (Interface)

O componente `DespesasManager` oferece:

- **Listagem** com tabela completa de despesas
- **Filtros** por categoria, status, mês e ano
- **Cards de totais** mostrando:
  - Total geral
  - Total pago
  - Total pendente
- **Formulário** para criar/editar despesas
- **Ações rápidas**:
  - Marcar como pago (botão ✓)
  - Editar (botão ✎)
  - Excluir (botão ✕)
- **Integração** com fornecedores cadastrados

### Banco de Dados

Tabela `despesas`:

- `id`: Identificador único
- `descricao`: Descrição da despesa (obrigatório)
- `categoria`: Categoria da despesa (enum)
- `valor`: Valor em reais (obrigatório)
- `data_vencimento`: Data de vencimento (obrigatório)
- `data_pagamento`: Data de pagamento (opcional)
- `status`: Status atual (pendente, pago, cancelado)
- `fornecedor_id`: Referência para tabela entities (opcional)
- `observacao`: Observações adicionais (opcional)
- `created_at`: Data de criação
- `updated_at`: Data de atualização

### Testes

Arquivo: `tests/api/v1/despesas/despesas.test.js`

Cobertura:

- ✓ Criação de despesas
- ✓ Validações de campos obrigatórios
- ✓ Listagem com filtros
- ✓ Atualização de despesas
- ✓ Exclusão de despesas

Para executar:

```bash
npm test -- tests/api/v1/despesas/despesas.test.js
```

## Integração na Página Principal

O módulo de despesas foi integrado na página principal (`pages/index.js`) como uma nova aba chamada "Despesas", junto com:

- Cliente / Fornecedor
- Produtos
- Pedidos

## Arquivos Criados

### Backend

- `/pages/api/v1/despesas/index.js` - Endpoint principal (GET, POST)
- `/pages/api/v1/despesas/[id].js` - Endpoint por ID (GET, PUT, DELETE)
- `/infra/migrations/1759400000000_create_despesas_table.js` - Migration

### Frontend

- `/components/despesas/DespesasManager.js` - Componente principal
- `/components/despesas/DespesaForm.js` - Formulário
- `/components/despesas/DespesasFilters.js` - Filtros
- `/components/despesas/DespesasTable.js` - Tabela de listagem
- `/components/despesas/index.js` - Barrel export

### Testes

- `/tests/api/v1/despesas/despesas.test.js` - Testes de integração

## Como Usar

1. Acesse a página principal
2. Clique na aba "Despesas"
3. Use o botão "Adicionar Despesa" para criar nova despesa
4. Preencha o formulário com os dados:
   - Descrição (obrigatório)
   - Categoria (obrigatório)
   - Valor (obrigatório)
   - Data de vencimento (obrigatório)
   - Status (padrão: pendente)
   - Fornecedor (opcional)
   - Observação (opcional)
5. Use os filtros para buscar despesas específicas
6. Clique nos ícones para ações rápidas:
   - ✓ = Marcar como pago
   - ✎ = Editar
   - ✕ = Excluir

## Features Futuras (Sugestões)

- [ ] Dashboard com gráficos de despesas por categoria
- [ ] Comparativo mês a mês
- [ ] Exportação para Excel/PDF
- [ ] Alertas de despesas próximas ao vencimento
- [ ] Recorrência de despesas fixas
- [ ] Anexar comprovantes/documentos
- [ ] Integração com contas bancárias
- [ ] Relatório de fluxo de caixa
