# Manual do Usuário — Hero-Pet

Este manual descreve o uso do sistema Hero-Pet para usuários finais.

---

## 1. Primeiro acesso

1. Acesse a URL do sistema no navegador.
2. **Configuração inicial (primeira vez):**
   - Se não houver usuários cadastrados, você será redirecionado para a tela de configuração (`/setup`).
   - Preencha:
     - **Nome** — mínimo 2 caracteres
     - **Email** — endereço válido
     - **Senha** — mínimo 8 caracteres
   - Clique em **Criar administrador**.
3. **Login:**
   - Na tela de login, informe email e senha.
   - Clique em **Entrar**.
4. **Troca de senha obrigatória:**
   - Se o sistema exigir alteração de senha (por exemplo, após uso de senha padrão), você será redirecionado para a tela **Alterar senha**.
   - Informe a senha atual, a nova senha e a confirmação.
   - Clique em **Alterar senha**.

---

## 2. Relatórios

Acesse o menu **Relatórios** no sistema.

### Abas disponíveis

- **DRE** — Demonstração do Resultado do Exercício  
- **Fluxo de Caixa** — Entradas e saídas por período  
- **Margem por Produto** — Margem de lucro por produto  
- **Ranking** — Ranking de produtos/vendas  

### Seleção de período

- Escolha o **mês** e o **ano** desejados para filtrar os dados.

### Exportar

- Use o botão **PDF** para exportar o relatório em PDF.  
- Use o botão **Excel** para exportar em planilha Excel (.xlsx).

---

## 3. Estoque

### Tela de estoque

- Exibe os **saldos atuais** por produto.
- Mostra alertas quando o estoque está abaixo do mínimo configurado.

### Movimentações

É possível registrar:

- **Entrada** — Entrada de mercadorias (informe quantidade e valor unitário).
- **Saída** — Saída de mercadorias (quantidade deve ser menor ou igual ao saldo).
- **Ajuste** — Correção de saldo (pode ser positivo ou negativo, respeitando o saldo disponível).

### Histórico de movimentações

- Use a seção **Ver histórico de movimentações** para consultar as movimentações anteriores.
- A listagem é paginada. Use **Carregar mais** para exibir mais registros.

---

## 4. Clientes e Fornecedores

A tela de **Clientes e Fornecedores** permite cadastrar e gerenciar pessoas físicas (clientes) e jurídicas (fornecedores).

### Indicadores (cards)

- **Total** — Quantidade total de entidades cadastradas.
- **Clientes** — Quantidade de pessoas físicas (PF).
- **Fornecedores** — Quantidade de pessoas jurídicas (PJ).
- **Documentos válidos** — Percentual de entidades com documento validado.
- **Endereço completo** — Percentual com CEP e número preenchidos.
- **Contato completo** — Percentual com telefone e e-mail válidos.

### Filtros

- **Buscar** e **Perfil** (Cliente/Fornecedor) — Sempre visíveis.
- **Filtros avançados** — Clique para expandir: Status, Endereço, Contato.
- **Limpar filtros** — Restaura os filtros ao estado inicial.

### Exportação

- Use os botões **CSV** ou **Excel** para exportar os dados filtrados.

### Formulário

- Clique em **Adicionar** para criar uma nova entidade.
- Clique em uma linha da tabela para editar.
- O formulário abre em um modal; use ESC ou Cancelar para fechar.

---

## 5. Outras telas

- **Produtos** — Cadastro e gestão de produtos.  
- **Pedidos** — Criação e acompanhamento de pedidos de venda/compra.  
- **Financeiro** — Contas a receber e a pagar.

---

## 6. FAQ — Perguntas frequentes

### Esqueci minha senha. O que fazer?

No momento, não há recuperação automática de senha. Entre em contato com o **administrador do sistema**, que poderá redefinir sua senha ou orientar sobre os próximos passos.

### Como o administrador pode resetar a senha de um usuário?

O administrador deve usar o banco de dados ou ferramentas administrativas do sistema para alterar a senha do usuário, conforme procedimento técnico definido para o ambiente.

### Por que fui redirecionado para alterar a senha?

O sistema pode exigir a troca de senha quando:
- Você utiliza uma senha padrão pela primeira vez.
- O administrador definiu que sua senha deve ser alterada.

---

## Ajuda adicional

Para suporte técnico ou dúvidas sobre o funcionamento do sistema, consulte o administrador do ambiente ou a documentação técnica do projeto.
