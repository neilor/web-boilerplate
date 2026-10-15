# ADR 0002: Next.js App Router × SPA

- **Status:** proposta para revisão. Next.js é o **candidato demonstrativo** desta referência, não uma escolha oficial.
- **Data:** 2026-10-15.

## Contexto

Há duas formas comuns de frontend já em uso em projetos parecidos:

- **SPA autenticada** (Vite + React + roteador no cliente + TanStack Query + SDK de identidade no browser). Tudo
  renderiza no navegador; a hospedagem é estática.
- **Painel servido pelo próprio servidor** (um servidor pequeno que media o login por cookie e entrega páginas HTML com
  módulos JS nativos, sem framework de UI). O browser nunca guarda token.

Esta referência usa **Next.js 16 (App Router)**. Este documento registra o que isso compra e o que custa, para que a
escolha de um produto real seja feita com os trade-offs à vista. **Next não é automaticamente melhor.**

## Comparação

| Critério                | SPA (Vite + React)                             | Next.js App Router                                                                                     |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Primeira renderização   | HTML vazio + JS; dado chega depois do bundle   | HTML com dado já renderizado no servidor; o cliente hidrata o cache                                    |
| SEO / páginas públicas  | fraco sem pré-render                           | bom: metadados por página, conteúdo no HTML                                                            |
| App 100% autenticado    | encaixa bem; SEO é irrelevante                 | funciona, mas o ganho de SSR é menor e o servidor vira parte do caminho de cada página                 |
| Hospedagem e custo      | estático em CDN; quase nenhum custo por acesso | precisa de runtime Node (ou export estático, perdendo recursos de servidor); custo por renderização    |
| Cache                   | só no browser (TanStack Query)                 | browser + servidor; **cache de servidor exige cuidado com identidade** (ver arquitetura)               |
| Auth                    | token no browser via SDK de identidade         | cookie de sessão lido no servidor (BFF) ou token no browser; os dois cabem                             |
| Realtime                | assinaturas no cliente, direto                 | igual: assinaturas só em Client Components; o servidor não mantém conexão                              |
| DX                      | build simples, HMR rápido, menos conceitos     | mais conceitos (Server/Client Components, `use client`, cache, rotas dinâmicas); mais convenção pronta |
| Fronteira com o backend | o browser chama a API                          | o servidor Next pode chamar a API por rede interna e esconder a URL; risco de virar "segundo backend"  |

## O que esta referência faz para não errar nos pontos sensíveis

- **Nenhuma regra de negócio no servidor Next.** Ele só repassa chamadas para a API pelo mesmo SDK que o browser usa.
  Não é um segundo backend.
- `QueryClient` e cliente de API **por requisição** no servidor; `cache: 'no-store'` para dado com identidade.
- Assinaturas ao vivo só no cliente, com limpeza garantida (`useRealtimeValue`).
- Server Components só para a primeira leitura e metadados. A interação vive em Client Components que usam os mesmos
  hooks de uma SPA, então **migrar para SPA não exige reescrever as features**: as camadas `sdk-core`,
  `sdk-react` e `features/` independem do Next.

## Quando preferir cada um

- **SPA:** produto todo atrás de login, sem páginas públicas indexáveis, com equipe acostumada a SPA e hospedagem
  estática desejada.
- **Next:** há páginas públicas (catálogo, perfil público, landing com dados) que precisam de SEO ou de primeira tela
  rápida em rede lenta, ou o time quer mediar a sessão no servidor (cookie HttpOnly) em vez de guardar token no browser.
- **Misto:** áreas públicas em Next e área logada como Client Components. A própria referência já funciona assim.

## Fontes verificadas (2026-10-15)

- O Next suporta SPA estrita, renderizada no cliente, e pode começar como site estático; recursos de servidor não
  funcionam em export estático: <https://nextjs.org/docs/app/guides/single-page-applications>
- Layouts e páginas são Server Components por padrão; `"use client"` declara a fronteira:
  <https://nextjs.org/docs/app/getting-started/server-and-client-components>
- Next 16: `params`/`searchParams` só assíncronos; `next lint` removido (ESLint roda direto):
  <https://nextjs.org/docs/app/guides/upgrading/version-16>
- TanStack Query: `QueryClient` novo por requisição no servidor e `HydrationBoundary` + `dehydrate`:
  <https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr>
