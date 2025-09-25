# Componentes: Padrões e Boas Práticas

Este guia documenta padrões adotados durante a refatoração dos components. Use-o como referência ao criar ou evoluir componentes.

## Formatação e Máscaras
- Moeda: usar `formatBRL(value)` de `components/common/format` para exibir valores monetários.
- Quantidade (geral): usar `formatQtyBR(value)` para exibir quantidades com locale pt-BR (máx 3 casas).
- Quantidade (Pedido): dentro de `components/pedido/*`, prefira `formatQty(value)` de `components/pedido/utils.js` (preserva string vazia e lida melhor com entradas parciais de formulário).
- Nunca calcular via exibidor: mantenha cálculos separados (toFixed) e passe o resultado para o formatador apenas na renderização.

## Modais
- Use `components/common/Modal` como base.
- Para variações (ex.: products), prefira wrapper fino que reusa o Modal base, mantendo API compatível (ex.: prop `open`).
- Evite duplicar estrutura/estilos de modal.

## Toasts
- Use `useToast` de `components/entities/shared/toast`.
- Sempre envolva a árvore com `ToastProvider` (normalmente em `_app.js`).
- Evite implementações locais de snackbar/alertas.

## Organização por Domínio
- Prefira pasta por domínio (ex.: `components/pedido/*`, `components/products/*`).
- Fatores comuns (Modal, formatadores, UI básicos) ficam em `components/common` ou `components/ui`.

## Acessibilidade
- Labels e aria-* consistentes (ex.: `aria-describedby` em campos com mensagens dinâmicas).
- Títulos descritivos e botões com `aria-label` quando o texto não estiver visível.
- Foco/fechamento: Modal fecha com ESC e backdrop, sem “click-through”.

## Estado e Máscaras em Formulários
- Armazene somente valores "limpos" (ex.: dígitos) no estado. Formate na visão.
- Dispare reclassificações em `onBlur` para evitar churn visual excessivo.

## Testes
- Priorize testes de integração exercitando fluxo real.
- Para novos endpoints, crie pasta espelhada em `tests/api/v1/<endpoint>`.
- Para UI, valide digitação parcial, blur e classificação quando aplicável.

## Anti-padrões a evitar
- Duplicar componentes idênticos (ex.: múltiplos Modals com estilos distintos).
- Repetir formatação de moeda/quantidade inline (`R$ ${n.toFixed(2)}`).
- Calcular em exibidores (ex.: `toFixed()` direto na JSX) sem separar a lógica.
- Criar toasts ad-hoc fora do `ToastProvider`.

## Exemplos rápidos
- Exibir BRL: `formatBRL(total)`
- Exibir quantidade: `formatQtyBR(qtd)`
- Reusar Modal: `import { Modal } from 'components/common/Modal'`

## Datas (evitar drift de timezone)
- Para datas de banco no formato `YYYY-MM-DD` (ou strings ISO), use `formatYMDToBR` de `components/common/date`.
- Para data/hora em UI, use `formatDateTimeBR`.
- Evite criar `new Date('YYYY-MM-DD')` só para exibir — isso aplica timezone e pode deslocar um dia.

---

Mantenha este guia atualizado conforme novos padrões forem introduzidos.
