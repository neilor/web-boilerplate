# web-boilerplate

Referência de organização para um frontend web que consome uma API descrita em OpenAPI:

```text
contrato OpenAPI → tipos gerados → cliente fetch tipado → getters → query keys / queryOptions → hooks React → features → páginas
```

> **Status:** rascunho de referência na branch `feat/modern-web-reference`. **Não é a stack oficial de nenhum
> produto.** Serve para discutir organização, fronteiras e práticas. O `master` continua com o projeto original
> (Create React App, 2018), com o histórico preservado.

Tudo aqui roda localmente, sem credenciais: o contrato é **sintético** (um catálogo genérico de itens), os dados são
inventados e a API é um mock em memória.

## Rodar

Requisitos: Node 22.13+ (veja `.nvmrc`) e npm 10+.

```bash
npm install
npm run dev          # mock da API em http://127.0.0.1:4010 + app em http://localhost:3000
```

No cabeçalho do app, **Demo identity** troca entre anônimo, leitor e editor. É uma identidade de demonstração, aceita
só pelo mock; não existe autenticação real neste repositório.

| Comando                   | O que faz                                                                 |
| ------------------------- | ------------------------------------------------------------------------- |
| `npm run generate`        | Gera os tipos do SDK a partir de `contracts/catalog.openapi.yaml`         |
| `npm run check:generated` | Falha se o código gerado commitado não bate com o contrato (usado no CI)  |
| `npm run typecheck`       | TypeScript em todos os pacotes                                            |
| `npm run lint`            | ESLint (preset do Next, regras de fronteira entre camadas)                |
| `npm run format:check`    | Prettier                                                                  |
| `npm test`                | Testes unitários do SDK, dos hooks, do mock e da lógica das telas         |
| `npm run build`           | Build de produção do app                                                  |
| `npm run e2e`             | Smoke end-to-end (Playwright) contra o build e o mock; rode o build antes |
| `npm run check`           | Tudo acima, menos o e2e                                                   |

O SDK também funciona fora do React. Com o mock rodando:

```bash
npm run example:cli -w @web-boilerplate/sdk-core -- lamp
```

## Estrutura

```text
contracts/                 contrato OpenAPI sintético + dados fictícios do mock
packages/sdk-core/       núcleo do SDK, sem React: cliente, auth, erros, ambientes, getters, query keys
packages/sdk-react/      adaptador React: provider, queryOptions, hooks, mutações
apps/web/                  app Next.js (App Router): páginas finas, features, componentes
tools/mock-api/            mock local do contrato (o mesmo handler serve os testes)
docs/                      arquitetura, decisões (ADRs) e guias
```

Cada camada só conhece a de baixo: páginas compõem features, features usam hooks, hooks usam o núcleo, o núcleo usa o
transporte. Detalhes em [docs/architecture.md](docs/architecture.md).

## Documentação

- [Arquitetura e responsabilidades](docs/architecture.md): camadas, diretórios, fluxo de dados, cache, auth, realtime.
- [Usar um contrato OpenAPI real](docs/openapi-source.md): gerar o SDK no seu ambiente privado, com proveniência.
- [Compatibilidade e versões](docs/compatibility.md): versão do contrato × versão do SDK × versão do app.
- [Versões fixadas](docs/versions.md): o que está fixado e por quê.
- [Lições de projetos anteriores](docs/lessons.md): o que manter e o que trocar.
- Decisões:
  - [ADR 0001: pipeline OpenAPI → SDK](docs/adr/0001-openapi-pipeline.md)
  - [ADR 0002: Next.js App Router × SPA](docs/adr/0002-next-vs-spa.md)
  - [ADR 0003: monorepo × repositórios separados](docs/adr/0003-repository-layout.md)

## Dados e segurança

- O contrato, os dados e as identidades são sintéticos. Nenhuma URL, chave ou dado real está no repositório.
- Os tokens `demo-editor` e `demo-viewer` são strings públicas aceitas só pelo mock local.
- `.env*` fica fora do git (só `.env.example` entra). Contratos privados baixados para gerar tipos ficam em
  `contracts/private/`, também ignorado.

## Licença

MIT, como o projeto original. Veja [LICENSE](LICENSE).
