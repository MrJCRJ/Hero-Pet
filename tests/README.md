# Guia de Testes

## Convenção para componentes com fetch imediato

Para componentes que disparam `fetch` em `useEffect` logo após o `render`, utilize o helper `renderAndFlush`:

```js
import { renderAndFlush } from "tests/test-utils/renderAndFlush";

await renderAndFlush(<MeuComponente />); // realiza 2 ciclos de flushAsync por padrão
```

Isso cobre a sequência comum: `fetch -> setState(data) -> setLoading(false)` evitando warnings de `act()` e necessidade de `waitFor` vazio.

Se o componente encadear mais efeitos (ex.: um segundo `useEffect` dependente do primeiro), aumente o número de ciclos:

```js
await renderAndFlush(<MeuComponente />, { cycles: 3 });
```

## Helpers Disponíveis

- `flushAsync(times=1)`: drena microtasks dentro de `act()`.
- `renderAndFlush(ui, { cycles=2 })`: abstrai `render` + `flushAsync` (2 ciclos default).
- `expect().toHaveNoActWarnings()`: matcher custom que falha se warnings de `act()` foram capturados no teste atual.
- `global.expectNoActWarnings()`: função utilitária que lança erro se houver warnings.

### Scripts de suporte

Adicionados no `package.json`:

- `npm run test:act-debug` – executa suíte com `DEBUG_ACT_WARNINGS=1` exibindo warnings capturados.
- `npm run test:act-strict` – executa suíte com `ACT_STRICT=1`; qualquer warning de `act()` falha o teste no `afterEach`.

### Exemplo de uso do matcher

```js
test("componente estável", async () => {
  await renderAndFlush(<ComponenteAssincrono />);
  expect().toHaveNoActWarnings();
});
```

## Debug Opcional

Defina variáveis de ambiente para debug detalhado:

- `DEBUG_MISSING_LABELS=1`: exibe logs de labels ausentes em gráficos de custos de produtos.
- `DEBUG_ACT_WARNINGS=1`: mantém warnings originais de `act()` no console (por padrão ficam silenciosos e apenas capturados internamente).
- `ACT_STRICT=1`: transforma qualquer warning de `act()` em erro imediato após cada teste.

## Boas Práticas

1. Evite `waitFor` sem asserção – prefira `renderAndFlush` e asserções diretas.
2. Centralize mocks de hooks (ex.: produtos) em util único para manter consistência.
3. Use flags de debug somente ao investigar falhas intermitentes.
4. Não suprimir genericamente todos os `console.error`; filtre por substrings específicas (já feito para warnings de act).
5. Para testes críticos (flows de highlight, abertura de modais encadeados), considere `expect().toHaveNoActWarnings()` ao final.

## Quando NÃO usar renderAndFlush

- Testes puramente síncronos (sem `useEffect`/fetch inicial). Use `render` normal.
- Hooks isolados (use testes de hook com `@testing-library/react` providers ou wrappers específicos).

## Política de Uso do Matcher Crítico

Use o matcher em:

- Testes de integração que validam flows de navegação cross-dashboard (`highlight`).
- Componentes que abrem múltiplos modais sequenciais.
- Casos históricos de warnings intermitentes.

Evite aplicação indiscriminada: o modo `ACT_STRICT` cobre auditorias eventuais (CI semanal ou pré-release).

---

Última atualização: 2025-10-02
