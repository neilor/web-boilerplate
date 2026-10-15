# ADR 0001: pipeline OpenAPI → SDK

- **Status:** proposta para revisão (branch de referência).
- **Data:** 2026-10-15.

## Contexto

O backend já publica contratos OpenAPI. O frontend precisa de:

- tipos e um cliente HTTP **gerados de forma determinística** a partir de um arquivo explícito;
- um núcleo sem React, usável em servidor, script e teste;
- `queryOptions`, query keys e hooks por cima desse núcleo;
- chaves de cache que separem **ambiente e identidade**;
- nenhum cliente global compartilhado entre usuários no servidor.

Comparamos três caminhos e adotamos um só.

## Prova feita

Mesmo contrato sintético (`contracts/catalog.openapi.yaml`, 6 operações), três geradores nas versões estáveis do
registry em 2026-10-15. Cada gerador rodou duas vezes e as saídas foram comparadas com `diff -r`.

| Gerador                                             | Versão          | Determinístico | Linhas geradas | O que gera                                                                                            |
| --------------------------------------------------- | --------------- | -------------- | -------------- | ----------------------------------------------------------------------------------------------------- |
| openapi-typescript (+ openapi-fetch em runtime)     | 7.13.0 / 0.17.0 | sim            | 298            | só tipos (`paths`, `components`, `operations`); o cliente é uma biblioteca pequena, não gerada        |
| Orval (`fetch` + `react-query`)                     | 8.43.0          | sim            | 1.366          | função por operação, hook `useX` por operação, `getXQueryKey`, `getXQueryOptions`                     |
| Hey API (`client-fetch` + `sdk` + `tanstack-query`) | 0.99.0          | sim            | 2.447          | SDK por operação + runtime do cliente copiado para a saída + `xOptions()` / `xQueryKey()` (sem hooks) |

Observações da saída gerada, além do que dizem as documentações:

- **Orval:** sem configuração extra, as funções usam o `fetch` global com URL relativa, sem URL base nem token. Para
  injetar transporte, auth e URL base é preciso um `mutator` próprio. As keys são `[path, params]`, sem
  ambiente nem identidade. O arquivo de hooks importa `@tanstack/react-query`, então núcleo e adaptador saem acoplados,
  a menos que se configurem dois alvos separados.
- **Hey API:** gera uma instância padrão de cliente (`client.gen.ts`). Dá para passar outro cliente por chamada, mas
  esquecer de passar cai no padrão, que é estado de módulo: no servidor isso é perigoso. A key inclui `baseUrl` (bom
  para ambiente), mas não identidade, e inclui `headers` quando passados, o que pode colocar credencial na key. O
  `queryFn` gerado lê os parâmetros de `queryKey[0]`, então prefixar a key com o escopo quebra a função.
- **openapi-typescript + openapi-fetch:** gera só tipos. O cliente aceita `fetch` customizado, `baseUrl` por instância
  e middleware `onRequest` para o token. Não gera hooks nem getters por operação; eles são escritos à mão, finos e
  tipados pelo contrato (ver `packages/sdk-core/src/features/*/requests.ts`).

## Decisão

**openapi-typescript (tipos) + openapi-fetch (runtime), com getters, keys, `queryOptions` e hooks escritos no
repositório.**

Motivos:

1. **Fronteira limpa:** o que é gerado são só tipos. O comportamento (auth, erros, retry, cache, keys) fica em código
   pequeno, revisável e testado, igual para todas as operações.
2. **Núcleo realmente sem React e sem estado global:** o cliente é criado por `createApiClient` e passado
   explicitamente. No servidor existe um por requisição.
3. **Keys com ambiente e identidade** sem brigar com o gerador.
4. **Menos superfície de upgrade:** uma dependência de runtime (`openapi-fetch`) e uma de build (`openapi-typescript`).
   Os diffs de upgrade do gerador ficam restritos a um arquivo de tipos.
5. **Determinismo verificável:** `npm run check:generated` falha no CI se a saída commitada diverge do contrato. O
   arquivo `*.provenance.json` registra o hash do contrato e a versão do gerador.

## Custo aceito

- Cada operação que uma feature usa ganha um getter e, se for lida por tela, uma `queryOptions` e um hook. São 3 a 10
  linhas cada, mas são escritas à mão.
- Para uma API com centenas de operações, isso não escala se **todas** forem usadas no front. Na prática, as features
  usam um subconjunto. As demais continuam acessíveis e tipadas por `api.http.GET('/rota', ...)`.

## Quando revisar

- Se as features passarem a usar a maior parte das operações, ou se o time preferir hooks por operação gerados: Orval
  com `mutator` próprio, saída de núcleo e de hooks em alvos separados, e keys reescritas com o escopo. Alternativa:
  Hey API com o plugin de TanStack, sempre passando o cliente por chamada e envolvendo as keys.
- Não adotar mais de um gerador ao mesmo tempo.

## Fontes verificadas (2026-10-15)

- openapi-fetch: "type-safe fetch client", "Weighs 6 kb" e geração de tipos com openapi-typescript:
  <https://openapi-ts.dev/openapi-fetch/>
- Middleware `onRequest`/`onResponse`/`onError` e exemplo de cabeçalho `Authorization`:
  <https://openapi-ts.dev/openapi-fetch/middleware-auth>
- openapi-react-query: "`queryKey` is `[method, path, params]`" (sem ambiente nem identidade; por isso não foi adotado):
  <https://openapi-ts.dev/openapi-react-query/query-options>
- Orval: função, hook, `getXQueryKey` e `getXQueryOptions` por operação:
  <https://orval.dev/docs/guides/react-query/>. `override.mutator` para cliente HTTP próprio:
  <https://orval.dev/docs/guides/fetch-client/> e <https://orval.dev/docs/reference/configuration/output/>
- Hey API: saída com `client.gen.ts`, `sdk.gen.ts` e `types.gen.ts`: <https://heyapi.dev/docs/openapi/typescript/output>.
  Plugin TanStack gera `xOptions()`, `xQueryKey()` e `xMutation()`, sem hooks:
  <https://heyapi.dev/docs/openapi/typescript/plugins/tanstack-query>. Cliente padrão configurável e cliente por chamada:
  <https://heyapi.dev/docs/openapi/typescript/clients/fetch>
- Um `QueryClient` novo por requisição no servidor, para que dados não sejam compartilhados entre usuários:
  <https://tanstack.com/query/latest/docs/framework/react/guides/ssr> e
  <https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr>
