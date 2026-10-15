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

## A hipótese do frontend separado

No cenário comparado, o backend e seus contratos já existem, e o app mobile já vive em repositório próprio. Nesse
contexto, um repositório web separado (M3) tende a encaixar melhor:

- **Ciclos independentes:** web, mobile e backend publicam no seu próprio ritmo. Um deploy do web não depende do pipeline
  do backend, e vice-versa.
- **CI, runtime e permissões próprios:** quem trabalha no web não precisa de acesso ao código e às credenciais do
  servidor. A versão de Node e as ferramentas do web não ficam presas às do backend.
- **Releases legíveis:** cada repositório tem seu histórico; o changelog do web não se mistura com o do servidor.
- **O web vira mais um consumidor**, igual ao mobile: mesma regra de contrato, mesmos testes de compatibilidade.

Mas a separação só funciona com três peças que esta referência demonstra:

1. **contrato versionado com dono:** o backend publica o OpenAPI com versão e hash;
2. **SDK produzido pelo produtor**, ou gerado de forma determinística a partir de um contrato fixado, com CI que falha
   quando o código gerado diverge do contrato;
3. **adaptador React separado do núcleo:** query keys, hooks e política de cache moram no consumidor; tipos e
   transporte moram no SDK.

O OpenAPI sozinho não organiza versão, semântica de erro, autenticação nem cache. Isso é contrato humano, registrado em
documentação e em testes. Ferramentas que geram código ou automatizam handoffs aceleram o trabalho, mas não substituem
o controle explícito de versões do contrato.

## Recomendação (sem decidir)

- **O contrato fica com o backend.** O OpenAPI é a fonte. O SDK é gerado do lado produtor e versionado, e os testes de
  compatibilidade das rotas usadas por versões publicadas dos clientes moram junto.
- **Onde fica o app web:**
  - M3 (separado) se a prioridade for independência de ciclo, de CI e de acesso; pede antes o pipeline de contrato e de
    SDK descrito acima;
  - M1 (dentro do monorepo) se a prioridade for começar rápido e a equipe do web já tiver acesso ao backend; pede antes
    o CI com filtro por caminho e a regra de fronteira.
- **Esforço:** M1 é o menor para começar; M3 é o maior e o mais estável no longo prazo.
- Em qualquer opção, as camadas desta referência (`sdk-core`, `sdk-react`, `features/`) são as mesmas. Muda só
  onde o pacote do SDK é produzido.
- O workspace leve deste repositório é só o exemplo: juntar `apps/web` e os pacotes do SDK aqui **não** equivale a
  colocar o frontend dentro do backend de produção.
