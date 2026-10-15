# Usar um contrato OpenAPI real

Este repositório é público e usa só `contracts/catalog.openapi.yaml`, que é sintético. Um contrato real de um produto
**nunca** entra aqui. Ele é usado no ambiente privado de quem consome esta referência.

## Gerar tipos a partir de outro contrato

O gerador lê um arquivo explícito e escreve os tipos e um registro de proveniência:

```bash
OPENAPI_SOURCE=/caminho/para/contrato.yaml \
OPENAPI_OUTPUT=/caminho/do/seu/pacote/src/generated \
OPENAPI_OUTPUT_NAME=product \
npm run generate
```

Saída:

- `product.ts`: tipos `paths`, `components` e `operations`. Começa com o sha256 do contrato.
- `product.provenance.json`:
  ```json
  {
    "source": "product.yaml",
    "sha256": "<hash do contrato com quebras de linha normalizadas>",
    "infoVersion": "<info.version do contrato>",
    "generator": "openapi-typescript@7.13.0",
    "options": { "alphabetize": true }
  }
  ```

Quando o contrato está fora do repositório, a proveniência registra **só o nome do arquivo**, nunca o caminho local.

## Regras para o repositório privado do consumidor

1. **Fixe a versão do contrato.** Baixe-o de uma tag ou de um commit do backend, nunca de um branch móvel, e guarde o
   hash em `*.provenance.json`.
2. **Commite a saída gerada** e rode no CI o equivalente a `npm run check:generated`: gerar de novo e falhar se houver
   diff. Assim uma mudança de contrato aparece no PR como diff de tipos, e não em produção.
3. **Contratos com várias superfícies** (API de usuário, API administrativa) viram arquivos gerados separados. Só
   entram no bundle do browser os tipos da superfície que ele chama.
4. **Arquivos por handler:** se o backend mantém um YAML por rota, junte-os num documento só antes de gerar, com um
   bundler de OpenAPI (por exemplo, `redocly bundle`). Gere a partir desse arquivo único e registre o hash dele.
5. **Nada de segredo no contrato:** URLs de produção, chaves e exemplos com dados reais ficam fora do documento usado
   para gerar, ou são substituídos por exemplos fictícios.
6. **Onde guardar localmente:** `contracts/private/` está no `.gitignore` deste repositório, para testes locais com um
   contrato que não pode ser publicado.

## Adicionar uma operação nova numa feature

1. Gere os tipos de novo (o diff aparece em `src/generated/`).
2. Escreva o getter em `packages/sdk-core/src/features/<feature>/requests.ts` (3 a 5 linhas, tipado pelo `paths`).
3. Se for leitura usada por tela: acrescente a key em `keys.ts`, a `queryOptions` em
   `packages/sdk-react/src/features/<feature>/queries.ts` e o hook em `hooks.ts`.
4. Se for escrita: um hook de mutação que invalida as keys afetadas depois da resposta. Sem atualização otimista em
   dado financeiro.
5. Teste o getter com um transporte falso e o hook contra o mock.
