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

## Estrutura Principal

- `components/`: Componentes React reutilizáveis (formulários, navegação, UI)
- `contexts/`: Contextos globais (ex: tema)
- `hooks/`: Hooks customizados
- `infra/`: Infraestrutura, banco de dados, scripts e migrações
- `pages/`: Páginas da aplicação e rotas de API
- `tests/`: Testes automatizados

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
