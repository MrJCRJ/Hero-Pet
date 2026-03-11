import Link from "next/link";

/**
 * Página de Ajuda — exibe o manual do usuário.
 * Conteúdo baseado em docs/MANUAL_USUARIO.md
 */
export default function AjudaPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 prose prose-neutral dark:prose-invert">
      <h1 className="text-2xl font-bold mb-6">Manual do Usuário — Hero-Pet</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Primeiro acesso</h2>
        <ol className="list-decimal pl-6 space-y-2 text-[var(--color-text-primary)]">
          <li>Acesse a URL do sistema no navegador.</li>
          <li>
            <strong>Configuração inicial (primeira vez):</strong> Se não houver
            usuários, você será redirecionado para <Link href="/setup" className="text-[var(--color-accent)] underline">configuração</Link>.
            Preencha nome, email e senha (mín. 8 caracteres) e clique em Criar
            administrador.
          </li>
          <li>
            <strong>Login:</strong> Informe email e senha na tela de login e
            clique em Entrar.
          </li>
          <li>
            <strong>Troca de senha obrigatória:</strong> Se exigido, você será
            redirecionado para Alterar senha. Informe a senha atual, a nova
            senha e a confirmação.
          </li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Relatórios</h2>
        <p className="mb-2">
          Acesse o menu <Link href="/relatorios" className="text-[var(--color-accent)] underline">Relatórios</Link>.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Abas: DRE, Fluxo de Caixa, Margem por Produto, Ranking.</li>
          <li>Selecione mês e ano para filtrar.</li>
          <li>Botões PDF e Excel para exportar.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Estoque</h2>
        <p className="mb-2">
          Na tela de <Link href="/estoque" className="text-[var(--color-accent)] underline">Estoque</Link>:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Visualize saldos e alertas de estoque mínimo.</li>
          <li>Movimente: Entrada, Saída e Ajuste.</li>
          <li>Ver histórico de movimentações com paginação (Carregar mais).</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Outras telas</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <Link href="/entities" className="text-[var(--color-accent)] underline">Cliente / Fornecedor</Link> — Cadastro de pessoas e empresas.
          </li>
          <li>
            <Link href="/products" className="text-[var(--color-accent)] underline">Produtos</Link> — Gestão de produtos.
          </li>
          <li>
            <Link href="/orders" className="text-[var(--color-accent)] underline">Pedidos</Link> — Pedidos de venda/compra.
          </li>
          <li>
            <Link href="/financeiro" className="text-[var(--color-accent)] underline">Financeiro</Link> — Contas a receber e a pagar.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. FAQ</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Esqueci minha senha.</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Não há recuperação automática. Entre em contato com o administrador
              do sistema.
            </p>
          </div>
          <div>
            <h3 className="font-medium">Por que fui redirecionado para alterar a senha?</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              O sistema exige troca quando você usa senha padrão ou quando o
              administrador definiu que a senha deve ser alterada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
