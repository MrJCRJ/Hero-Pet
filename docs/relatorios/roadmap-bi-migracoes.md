# Roadmap: dados BI que exigem migração ou módulo novo

Este documento complementa o consolidado JSON (`schema_version` ≥ 1.2). Itens abaixo **não** estão no modelo operacional atual; exigem desenho de tabelas, fluxos e telas.

## 1. Validade por lote

- **Evidência:** `estoque_lote` (FIFO) sem `data_validade` no schema atual.
- **Ação sugerida:** coluna `data_validade` em `estoque_lote` ou tabela auxiliar; validação na entrada de estoque; relatório de vencimento próximo.

## 2. Metas e orçamento

- **Evidência:** ausência de tabelas de meta no repositório.
- **Ação sugerida:** entidade `metas_mensais` (por centro de custo ou conta DRE), período, valor alvo; comparação meta × real no consolidado quando houver cadastro.

## 3. Segmentação de cliente (B2B / B2C ou outro)

- **Evidência:** `entities` não expõe segmento comercial; apenas `entity_type` PF/PJ.
- **Ação sugerida:** campo `segmento` ou tabela de classificação; migração + tela de cadastro; depois agregados no consolidado por segmento.

## 4. CRM / marketing (origem, funil, leads)

- **Evidência:** sem módulo de leads ou campanhas.
- **Ação sugerida:** fase separada — mínimo: origem do pedido ou entidade; evolução para funil e integrações externas.

## Prioridade sugerida

1. Segmento de cliente (baixo acoplamento, alto valor para análise).  
2. Metas mensais (depende de definição contábil).  
3. Validade em lote (operacional + estoque).  
4. CRM completo (projeto maior).
