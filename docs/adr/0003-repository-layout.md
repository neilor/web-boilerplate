# ADR 0003: monorepo × repositórios separados

- **Status:** proposta para revisão. Esta referência usa um workspace leve **só para demonstrar as fronteiras**. Não
  recomenda mover nenhum frontend existente.
- **Data:** 2026-10-15.

## Contexto

O cenário comparado é um backend que já é monorepo (functions, bibliotecas internas e um app React no mesmo
workspace npm, com contratos OpenAPI ao lado dos handlers), enquanto outros clientes (mobile, painel interno) vivem
em repositórios próprios.

## Opções

| Opção                                                                  | A favor                                                                                                                               | Contra                                                                                                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1: `apps/web` dentro do monorepo do backend**                       | Precedente de app React no mesmo workspace; contrato e handler mudam no mesmo PR; tipos compartilhados; mudanças de contrato atômicas | Quem mexe no web passa a ter acesso ao backend; exige CI com filtro por caminho; risco de o web importar código de servidor (precisa de regra de fronteira); builds e versões de Node acoplados |
| **M2: repositório separado, sem SDK**                                  | Acesso, CI e deploy independentes; fronteira de API explícita                                                                         | Contrato diverge se não houver SDK versionado; mudar um endpoint vira PR em 2 repositórios; tooling duplicado                                                                                   |
| **M3: web separado + SDK gerado do OpenAPI e publicado pelo produtor** | Contrato com dono claro; o web consome só o SDK versionado; o legado fica protegido por testes de contrato no backend                 | Pipeline de geração e publicação (registry privado) para montar e manter                                                                                                                        |

## O que projetos anteriores de Neilor mostraram

Num monorepo anterior, servidor, SDK e apps viviam juntos:

- **Ajudou:** contrato e cliente mudavam no mesmo PR; renomear uma feature era uma busca só.
- **Atrapalhou:**
  - dependência invertida: o servidor importava o SDK do cliente;
  - dependências de cliente instaladas junto do servidor;
  - todo push construía e publicava tudo;
  - nenhuma regra impedia a UI de importar internals do SDK.

A lição não é "nunca monorepo". É que **a fronteira precisa de uma regra e de uma checagem**:

1. o produtor é dono do contrato e do SDK;
2. o SDK tem versão própria, ligada à versão do contrato;
3. consumidores importam só a entrada pública;
4. o CI constrói só o que mudou.

## Como esta referência demonstra a fronteira

- Workspace npm com pacotes pequenos. **Sem Turborepo/Nx:** com quatro pacotes, `npm run --workspaces` basta.
  Ferramenta de orquestração entra quando o tempo de CI justificar.
- `exports` de pacote com entrada única, e ESLint bloqueando `@web-boilerplate/*/*` e `openapi-fetch` fora do núcleo.
- O contrato entra como **arquivo explícito**. A geração é verificada no CI (`check:generated`).
- npm workspaces em vez de pnpm: é o mesmo gerenciador do backend comparado, o que reduz atrito para quem já trabalha
  nele. pnpm (`pnpm-workspace.yaml`, protocolo `workspace:`) continua uma alternativa válida: é mais estrito com
  dependências fantasmas. Ver <https://pnpm.io/workspaces/>.

## Recomendação (sem decidir)

- **O contrato fica com o backend.** O OpenAPI é a fonte. O SDK é gerado do lado produtor e versionado, e os testes de
  compatibilidade das rotas usadas por versões publicadas dos clientes moram junto.
- **Onde fica o app web:**
  - M1, se a equipe do web tiver acesso ao backend e o CI com filtro por caminho for criado antes;
  - M3, se o acesso precisar ser separado.
- **Esforço:** M1 é o menor para começar; M3 é o maior e o mais estável no longo prazo.
- Em qualquer opção, as camadas desta referência (`sdk-core`, `sdk-react`, `features/`) são as mesmas. Muda só
  onde o pacote do SDK é produzido.
