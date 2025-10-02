# Tests - Orders Module

## 📁 Estrutura de Testes

```
tests/integration/orders/
├── components/                    # 🧩 Testes de componentes
│   ├── Charts.test.js            # Testes dos gráficos
│   ├── Modals.test.js            # Testes dos modais (Info, Help)
│   ├── OrdersDashboard.test.js   # Teste do dashboard principal
│   └── PayPromissoriaModal.test.js # Teste do modal de pagamento
├── hooks/                        # 🪝 Testes de hooks
│   └── orders-hooks.test.js      # Testes dos hooks (useMonthState, useDashboardData)
└── OrdersManager.integration.test.js # Teste de integração principal
```

## 🎯 Cobertura de Testes

### ✅ **Componentes Testados**

#### Dashboard

- **OrdersDashboard.test.js**
  - ✅ Renderização de cards
  - ✅ Modal de ajuda
  - ✅ Navegação entre meses
  - ✅ Loading states

#### Modals

- **Modals.test.js**
  - ✅ InfoModal (abertura, fechamento, gráficos, navegação)
  - ✅ HelpModal (documentação, explicações)
- **PayPromissoriaModal.test.js**
  - ✅ Formulário de pagamento
  - ✅ Validações
  - ✅ Submissão

#### Charts

- **Charts.test.js**
  - ✅ ComprasHistoryChart
  - ✅ LucroBrutoDetails
  - ✅ VendasComprasOverlayDetails
  - ✅ Dados vazios e renderização

### ✅ **Hooks Testados**

#### orders-hooks.test.js

- **useMonthState**
  - ✅ Inicialização com localStorage
  - ✅ Persistência de mudanças
  - ✅ Navegação (anterior/próximo)
  - ✅ Formatação de datas

- **useDashboardData**
  - ✅ Carregamento de dados da API
  - ✅ Estados de loading
  - ✅ Tratamento de erros
  - ✅ Validação de parâmetros

### ✅ **Integração Testada**

#### OrdersManager.integration.test.js

- ✅ Renderização completa do OrdersManager
- ✅ Listagem de pedidos
- ✅ Abertura de modals
- ✅ Funcionalidade de promissórias

## 🧪 **Estratégia de Testes**

### Testes de Componentes

- **Smoke Tests**: Verificam se componentes renderizam sem erro
- **Interaction Tests**: Testam clicks, inputs e navegação
- **State Tests**: Verificam mudanças de estado e props
- **API Integration**: Mockam chamadas e testam responses

### Testes de Hooks

- **Isolation**: Testam hooks independentemente usando `renderHook`
- **State Management**: Verificam gerenciamento correto de estado
- **Side Effects**: Testam localStorage, API calls e cleanup
- **Edge Cases**: Validam comportamento com dados inválidos

### Mocks e Configuração

- **Global Fetch**: Mock para todas as chamadas de API
- **LocalStorage**: Mock para persistência de dados
- **Theme/Toast**: Wrappers para contextos necessários
- **Error Handling**: Spy em console.error para capturar erros

## 🚀 **Executando os Testes**

```bash
# Todos os testes do módulo orders
npm test -- tests/integration/orders

# Testes específicos
npm test -- tests/integration/orders/components/OrdersDashboard.test.js
npm test -- tests/integration/orders/hooks/orders-hooks.test.js

# Com cobertura
npm test -- tests/integration/orders --coverage
```

## 📊 **Métricas de Cobertura**

### Componentes Principais

- ✅ **OrdersDashboard**: Cobertura completa
- ✅ **PayPromissoriaModal**: Testes existentes migrados
- ✅ **InfoModal/HelpModal**: Testes novos criados
- ✅ **Charts**: Testes de renderização criados

### Hooks Customizados

- ✅ **useMonthState**: 100% dos casos cobertos
- ✅ **useDashboardData**: Estados e efeitos testados
- ✅ **usePedidos**: (Coberto indiretamente via integration)

### Utilities

- ✅ **Shared Utils**: Cobertas via testes de componentes
- ✅ **Constants**: Validadas indiretamente
- ✅ **Formatting**: Testada via mock data

## 🔄 **Melhorias Futuras**

### Cobertura Adicional

- [ ] Testes E2E com Playwright para fluxos completos
- [ ] Testes de performance para renderização de gráficos
- [ ] Testes de acessibilidade (a11y)
- [ ] Snapshot tests para componentes estáveis

### Tooling

- [ ] Coverage reporting automatizado
- [ ] Visual regression testing
- [ ] Testes de compatibilidade entre browsers
- [ ] Testes de responsividade

## 🏗️ **Organização vs Estrutura Anterior**

### ❌ **Antes** (Desorganizado)

```
tests/integration/
├── Orders.smoke.integration.test.js
├── PayPromissoriaModal.unit.test.js
└── OrdersFIFO.*.test.js (deprecated)
```

### ✅ **Depois** (Organizado)

```
tests/integration/orders/
├── components/ (testes focados por componente)
├── hooks/ (testes de lógica de estado)
└── integration (teste completo do fluxo)
```

### Benefícios da Reorganização

1. **Localização Intuitiva**: Fácil encontrar testes específicos
2. **Manutenibilidade**: Estrutura espelha a do código
3. **Escalabilidade**: Fácil adicionar novos testes
4. **Cobertura Clara**: Visibilidade do que está testado
5. **Removed Clutter**: Testes deprecated removidos

---

Esta estrutura garante cobertura robusta do módulo orders refatorado, mantendo testes organizados e fáceis de manter! 🎯
