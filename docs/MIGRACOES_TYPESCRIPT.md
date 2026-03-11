# Migrações em TypeScript

O `node-pg-migrate` suporta arquivos `.ts` além de `.js`.

## Formato TypeScript

```ts
import type { MigrationBuilder } from "node-pg-migrate";

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("minha_tabela", {
    id: "id",
    nome: { type: "text", notNull: true },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("minha_tabela");
}
```

## Ativar migrações TypeScript

Para rodar migrações `.ts`, use `ts-node`:

```bash
npx node-pg-migrate -m infra/migrations --envPath .env.development up --ts
```

Ou adicione ao `package.json`:

```json
"migration:up": "node-pg-migrate -m infra/migrations --envPath .env.development up --ts"
```

Novas migrações podem ser criadas em `.ts` com:

```bash
npm run migration:create nome_da_migracao
```

Edite o arquivo gerado e altere a extensão para `.ts` se desejar usar TypeScript.
