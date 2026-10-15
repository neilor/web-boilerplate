# Arquitetura e responsabilidades

## Camadas

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Backend (fora deste repo)  dono do contrato OpenAPI e das regras de negócio │
└──────────────────────────────────────────────────────────────────────────┘
          │ contrato (arquivo explícito, versionado, com hash)
          ▼
packages/sdk-core     tipos gerados → cliente → getters → query keys      (TS puro, sem React)
          ▼
packages/sdk-react    queryOptions → hooks → mutações → provider          (adaptador React)
          ▼
apps/web/src/features   containers (chamam hooks) + componentes de apresentação
          ▼
apps/web/app            páginas e layouts finos (rotas, metadados, prefetch no servidor)
```

Regra: **nenhuma camada pula a de baixo**. A página não chama o getter, o componente não chama `fetch`, o hook não
monta URL. O ESLint barra os atalhos mais comuns: importar `openapi-fetch` fora do núcleo e importar arquivos internos
de um pacote (`@web-boilerplate/*/*`). Cada pacote expõe uma única entrada (`exports` no `package.json`).

| Camada        | Responsável por                                                                            | Não faz                                       |
| ------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Backend       | contrato, autorização, validação final, regras de negócio, dinheiro                        | —                                             |
| Núcleo do SDK | transporte, token, ambiente, erros tipados, cancelamento, getters, query keys              | cache, React, regra de negócio, guardar token |
| Adaptador     | `queryOptions`, hooks, mutações com invalidação, política de retry, limpeza por identidade | chamar `fetch`, conhecer rotas HTTP           |
| Features      | estados de tela (carregando, vazio, erro, atualização), formulários, navegação             | falar com HTTP, decidir regra de negócio      |
| Páginas       | rota, metadados, prefetch no servidor, composição                                          | lógica de tela                                |

## Diretórios

```text
packages/sdk-core/
  scripts/generate.mjs          gera src/generated/ a partir de um OpenAPI explícito + arquivo de proveniência
  src/generated/                saída gerada (commitada; nunca editar à mão)
  src/client.ts                 createApiClient: ambiente, transporte injetável, token provider, unwrap
  src/auth.ts                   TokenProvider (interface) + provedores anônimo e fixo
  src/errors.ts                 ApiError, NetworkError, isAbortError
  src/environment.ts            defineEnvironment: valida URL base e nome do ambiente
  src/keys.ts                   ApiScope (ambiente + identidade) e a raiz de todas as query keys
  src/realtime.ts               contrato opcional de dados ao vivo + fonte em memória
  src/features/<feature>/       requests.ts (getters), keys.ts (query keys), types.ts (nomes públicos dos schemas)
packages/sdk-react/
  src/provider.tsx              ApiProvider: cliente + escopo no contexto; limpa o cache do escopo anterior
  src/query-client.ts           createQueryClient: staleTime, retry só para falha transitória, mutação sem retry
  src/realtime.ts               useRealtimeValue: assina ao montar, cancela ao desmontar
  src/features/<feature>/       queries.ts (queryOptions) e hooks.ts (useQuery/useMutation)
apps/web/
  app/                          rotas do App Router (layout, páginas, not-found, error, loading)
  src/features/<feature>/       containers (*-screen.tsx), apresentação, validação e helpers puros
  src/components/               componentes de apresentação compartilhados (estados, badges)
  src/lib/                      config do servidor, cliente por request, identidade de demonstração
  e2e/                          smoke Playwright
tools/mock-api/                 handler `(Request) => Promise<Response>` + servidor HTTP local
contracts/                      catalog.openapi.yaml (sintético) e fixtures/
```

## Fluxo de uma leitura

1. A página (`app/items/(list)/page.tsx`, Server Component) monta um `QueryClient` **só para esta requisição** e o
   cliente de API da requisição (`getServerApi`, com o token da identidade atual e `cache: 'no-store'`).
2. Ela faz o prefetch com as mesmas fábricas que o browser usa (`catalogQueries.itemList(api, query)`), serializa o
   cache com `dehydrate` e entrega para `HydrationBoundary`.
3. O container do browser (`ItemsScreen`) chama `useItems(query)`. A key é a mesma do servidor, então a primeira
   renderização usa o dado hidratado, sem nova requisição.
4. Filtros e paginação vivem na URL. Mudar um filtro troca a key; enquanto carrega, a tela mantém a página anterior
   (`placeholderData: keepPreviousData`) e mostra "Updating…".

## Fluxo de uma escrita

`useCreateItem` / `useUpdateItem`:

1. chamam o getter do núcleo;
2. **só depois da resposta da API** gravam o item confirmado no cache de detalhe e invalidam as listas do mesmo escopo;
3. não fazem atualização otimista. Em dado financeiro isso é regra: a tela mostra só o que o servidor confirmou;
4. não repetem automaticamente (`mutations.retry: false`): uma escrita que expirou pode ter sido aplicada.

A validação no formulário espelha os limites do contrato para dar resposta rápida. A API valida de novo e tem a
palavra final; os `fieldErrors` dela aparecem nos mesmos campos.

## Cache, identidade e ambiente

- **Toda query key começa com `['api', ambiente, identidade]`.** Dado de um ambiente ou de um usuário nunca é servido
  para outro, mesmo que o mesmo `QueryClient` seja reaproveitado.
- `identidade` é um id estável e não secreto (`anonymous`, id do usuário). **Nunca o token.**
- Ao trocar de identidade ou de ambiente, o `ApiProvider` remove do cache tudo o que pertencia ao escopo anterior.
- **Servidor:** um `QueryClient` e um cliente de API por requisição. Nada em variável de módulo que guarde dado de
  usuário. Requisições com identidade usam `cache: 'no-store'`.
- **Browser:** um `QueryClient` por aba, criado uma vez em estado do React.
- Cache público (CDN, `revalidate`) só vale para páginas que não leem identidade. Neste exemplo, o layout lê o cookie
  da identidade, então todas as rotas são dinâmicas. Separar páginas públicas cacheáveis é uma decisão de produto,
  registrada no [ADR 0002](adr/0002-next-vs-spa.md).

## Autenticação

O núcleo só conhece um `TokenProvider`: uma função chamada **a cada requisição** que devolve o token ou `null`.
O SDK nunca guarda token. Renovação, logout e MFA são responsabilidade da camada de identidade.

- Num app real, um adaptador ao lado do provedor de identidade implementa essa função. Pode ser o SDK de auth no
  browser ou uma sessão por cookie trocada no servidor (BFF).
- **A UI nunca importa o SDK do provedor de identidade para montar requisições.** Ela só conhece o `ApiProvider`.
- Neste repositório o provedor é de demonstração (`apps/web/src/lib/demo-identity.ts`), com tokens públicos aceitos
  só pelo mock.

## Erros

| Situação                       | O que o SDK lança                                                 | Comportamento padrão                    |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------- |
| Resposta não-2xx               | `ApiError` (status, `code`, mensagem, `fieldErrors`, `requestId`) | retry só em 408, 429 e 5xx, até 2 vezes |
| Sem resposta HTTP              | `NetworkError`                                                    | retry até 2 vezes                       |
| Cancelado pelo chamador        | o `AbortError` original                                           | ignorado: não é erro                    |
| Corpo de erro não-JSON (proxy) | `ApiError` com `code: http_<status>`                              | —                                       |

A tela mostra uma mensagem acionável e a referência (`requestId`), nunca stack trace (`describeError`).

## Cancelamento

Todo getter aceita `{ signal }`. Os hooks repassam o `signal` do TanStack Query, então uma tela desmontada no meio de
um carregamento cancela a requisição. O teste `abort the request when the last observer unmounts` cobre isso.

## Dados ao vivo (opcional)

`RealtimeSource` é um contrato para valores que mudam sozinhos: banco de dados em tempo real, SSE, websocket. Leitura e
escrita comuns continuam pelo HTTP.

O contrato de limpeza está em `packages/sdk-core/src/realtime.ts` e é testado:

- `subscribe` devolve `Unsubscribe`, que é idempotente;
- depois do `Unsubscribe`, nenhum valor chega;
- cada assinatura é independente;
- depois de um erro, a assinatura é encerrada.

`useRealtimeValue` assina ao montar e cancela ao desmontar ou ao trocar de canal. A tela de detalhe usa uma fonte
**simulada**, que inventa um número local. Nenhum banco real é conectado. Um adaptador para um banco real fica ao lado do
SDK do banco e implementa só essa interface; a UI não importa o SDK do banco.

## Telas

- Páginas finas: rota, metadados, prefetch.
- Containers (`*-screen.tsx`): leem URL, chamam hooks, escolhem o estado.
- Componentes de apresentação: recebem dados e callbacks, não chamam hooks de dados.
- Estados cobertos: carregando, vazio (com "limpar filtros"), erro com "Try again" e referência, atualizando em
  segundo plano, 404 real (status HTTP 404), formulário com erros por campo.
- Acessibilidade: `lang`, link "pular para o conteúdo", `label` em todo campo, `aria-invalid` e `aria-describedby` nos
  erros, `role="status"` e `role="alert"` nos estados, foco visível, `prefers-reduced-motion`, tema claro e escuro.
- Responsivo: grid fluido; filtros e cabeçalho empilham abaixo de 600 px. O smoke roda em desktop e em viewport de
  celular.

## O que este repositório não decide

- A stack oficial de qualquer produto.
- Hospedagem, CDN, região, observabilidade e feature flags.
- O provedor de identidade e o fluxo de login.
- A biblioteca de UI e o design system. O CSS aqui é mínimo e serve só à demonstração.
- Internacionalização. As strings são em inglês e fixas. Um app real deve extrair os textos por tela e testar a
  completude dos idiomas.
