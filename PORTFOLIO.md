# Hero-Pet — Sistema de Gestão Empresarial

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?style=flat-square&logo=tailwind-css)
![Jest](https://img.shields.io/badge/Jest-29-C21325?style=flat-square&logo=jest)

> Sistema completo de gestão para pet shop: entidades, produtos, pedidos, estoque (FIFO) e despesas, com dashboards interativos e relatórios.

## Resumo

O **Hero-Pet** é um ERP web desenvolvido para gerenciamento de dados de uma empresa do setor pet. A aplicação cobre o ciclo completo: cadastro de clientes e fornecedores, catálogo de produtos com histórico de custos, pedidos de compra e venda com controle de estoque FIFO, promissórias parceladas e painel de despesas.

## Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | Next.js 15, React 19, TailwindCSS 4, Framer Motion, Lucide Icons |
| **Backend** | Next.js API Routes (Node.js), PostgreSQL |
| **Banco de Dados** | PostgreSQL 16 (Docker), node-pg-migrate |
| **Testes** | Jest, Testing Library, integração com servidor Next |
| **Infraestrutura** | Docker Compose |

## Funcionalidades Principais

### Gestão de Entidades
- Cadastro de clientes (PF) e fornecedores (PJ) com validação de documentos
- Máscaras e normalização automática de CPF/CNPJ
- Filtros por status, busca e paginação
- Resumo de completude dos cadastros

### Gestão de Produtos
- Catálogo com categorias, código de barras e preço de tabela
- Vínculo com fornecedores e histórico de custos
- Gráfico de evolução de custo ao longo do tempo
- Soft delete e ranking de produtos mais vendidos

### Pedidos (Compras e Vendas)
- Formulário completo com itens, desconto, frete e lucro calculado
- Parcelamento em promissórias com datas configuráveis
- Cálculo de custo (COGS) por FIFO em vendas
- Dashboard com métricas mensais, gráficos de vendas vs compras e lucro bruto

### Estoque
- Movimentos de entrada, saída e ajuste
- Saldos e custo médio por produto
- Integração com pedidos (FIFO automático em compras e vendas)

### Despesas
- Cadastro e listagem de despesas com filtros

### Segurança e UX
- Painel administrativo protegido por código (configurável via env)
- Tema claro/escuro
- Autenticação simples baseada em códigos (client-side)

## Destaques Técnicos

- **API versionada** (`/api/v1/*`) com padronização de respostas
- **Migrações versionadas** para evolução segura do schema
- **FIFO** implementado para controle de custo de vendas
- **Paginação unificada** com meta de total e suporte a fallback legado
- **Deep-linking** para edição direta via `?highlight=<id>` ou `#tab=entities&highlightId=123`
- **Testes rigorosos** com `renderAndFlush` para componentes assíncronos e CI com verificação de warnings de `act()`
- **Linting de complexidade** para componentes (>350 linhas) e hooks (>400 linhas)

## Screenshots / Preview

*Adicione aqui capturas de tela do sistema quando disponíveis.*

## Repositório

- **GitHub**: [MrJCRJ/Hero-Pet](https://github.com/MrJCRJ/Hero-Pet)

## Executando o Projeto

```bash
# Instalar dependências
npm install

# Subir Postgres (Docker)
docker compose -f infra/compose.yaml up -d

# Configurar .env.development (Postgres na porta 5433)
# Executar migrações
curl -X POST http://localhost:3000/api/v1/migrations

# Iniciar em desenvolvimento
npm run dev
```

---

*Projeto desenvolvido para gestão e análise de dados da empresa Hero-Pet.*
