# Lições de projetos anteriores (frontend + SDK de cliente)

Uma geração anterior de projetos de Neilor mantinha backend, um SDK TypeScript de cliente e vários apps num
repositório só. O SDK era publicado e consumido pelos apps **e pelo backend**. Abaixo está o que facilitou a
manutenção, o que atrapalhou e como esta referência trata cada ponto.

Os exemplos são genéricos. Nenhum código foi copiado: tudo aqui foi escrito do zero.

## O que manter

1. **Uma pasta por feature, um arquivo por responsabilidade.** Chamadas HTTP, tipos e hooks com o mesmo nome de feature
   do servidor deixam o caminho página → hook → chamada → handler fácil de seguir.
   _Aqui:_ `packages/sdk-core/src/features/<feature>/{requests,keys,types}.ts`,
   `packages/sdk-react/src/features/<feature>/{queries,hooks}.ts`, `apps/web/src/features/<feature>/`.
2. **Entradas públicas separadas: núcleo e React.** O núcleo nunca importa React.
   _Aqui:_ dois pacotes, `exports` com entrada única e regra de lint contra imports internos.
3. **Validar a configuração na inicialização.** URL base inválida falha ao criar o cliente, não na primeira chamada.
   _Aqui:_ `defineEnvironment`.
4. **O token é anexado num lugar só.** _Aqui:_ um `TokenProvider` por instância de cliente, nunca lido de um global.
5. **Leitura só começa quando a identidade é conhecida.** _Aqui:_ `enabled` nos hooks que dependem de identidade.
6. **Mutações protegidas contra envio duplo e com retorno de sucesso/erro.** _Aqui:_ `useMutation` com o botão
   desabilitado durante o envio e invalidação explícita depois do sucesso. Nunca otimista para dinheiro ou saldo.
7. **Erro com código estável e mensagem para pessoas.** _Aqui:_ `ApiError` com `status`, `code`, `message`,
   `fieldErrors` e `requestId`.
8. **Tipos gerados de uma fonte única.** _Aqui:_ a fonte é o OpenAPI, e a geração é determinística e checada no CI.
9. **Páginas finas, componentes por feature, estado global só para identidade.**
10. **Commits convencionais e versionamento automático de pacotes publicados.** Não há publicação aqui, mas vale para o
    pacote do SDK num repositório real (ver [compatibility.md](compatibility.md)).

## O que trocar

| Visto antes                                                                      | Por que atrapalhou                                                                                                      | O que esta referência faz                                                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Cliente singleton em variável de módulo, acessado direto pelos hooks             | Difícil de testar; inseguro com renderização no servidor, onde a instância é compartilhada entre requisições e usuários | Cliente por requisição no servidor; no browser, via provider; hooks recebem o cliente do contexto                |
| Busca manual com `useState` + `useEffect`                                        | Sem cache, deduplicação, retry ou invalidação; padrão copiado por hook                                                  | TanStack Query com fábricas de `queryOptions` e keys com ambiente e identidade                                   |
| Sem contrato de API; tipos escritos à mão nos dois lados                         | Divergência só aparecia em runtime                                                                                      | OpenAPI → tipos gerados; CI falha se a saída gerada diverge do contrato                                          |
| Backend importando o SDK do cliente                                              | Dependência invertida: uma versão do cliente podia quebrar o servidor                                                   | O contrato sai do produtor; o SDK depende do contrato, nunca o contrário                                         |
| Páginas importando internals do SDK                                              | Toda refatoração interna quebrava a UI                                                                                  | `exports` + regra de lint                                                                                        |
| SDK com muitas dependências pesadas (várias libs de data, de HTTP, de validação) | Bundle grande e muitas frentes de upgrade                                                                               | Núcleo com uma dependência de runtime (`openapi-fetch`), `fetch` e `AbortSignal` nativos                         |
| Vários apps num pacote só, escolhidos por flag em runtime                        | Todo app carregava todas as dependências                                                                                | Um diretório por app em `apps/`                                                                                  |
| Vários sistemas de estilo em paralelo                                            | UI inconsistente e CSS morto                                                                                            | Um sistema de tokens CSS. A biblioteca de UI fica para o produto decidir                                         |
| Bootstrap de monorepo legado com hoisting e instalação forçada                   | Instalações não reprodutíveis                                                                                           | Workspaces nativos do gerenciador e lockfile honesto, sem orquestrador enquanto não for necessário               |
| Todos os pacotes versionados juntos e publicados a cada push                     | Versões sem mudança real                                                                                                | SDK com versão própria, ligada à versão do contrato                                                              |
| Quase nenhum teste de frontend                                                   | Refatoração arriscada                                                                                                   | Testes do núcleo (erros, auth, abort, keys), dos hooks contra o mock e smoke end-to-end de lista, detalhe e erro |
| Toda falha com o mesmo status HTTP                                               | Cliente não distinguia validação, auth e conflito                                                                       | Status corretos e corpo de erro tipado                                                                           |
| Arquivos de ambiente cifrados ou locais commitados junto do código               | Risco de segredo; onboarding dependia de senha                                                                          | `.env.example` e `.env*` no `.gitignore`; valores reais fora do repositório                                      |

## Formulários

Os projetos anteriores usavam uma biblioteca de formulário com validação por schema (react-hook-form + zod), que
continua uma boa escolha para formulários grandes. Aqui há um formulário pequeno. Ele usa estado controlado e uma
função de validação pura (`item-validation.ts`), testada, que espelha os limites do contrato, para não adicionar duas
dependências por um formulário. Um app real com muitos formulários deve adotar a biblioteca, sem misturar as duas
abordagens.
