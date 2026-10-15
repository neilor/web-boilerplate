# Versões fixadas

Versões estáveis conferidas no registry npm em **2026-10-15**. Nenhuma é canary, beta ou RC. Todas são fixadas exatas
(`save-exact`), e o `package-lock.json` está commitado.

| Pacote                    | Versão  | Observação                                                 |
| ------------------------- | ------- | ---------------------------------------------------------- |
| next / eslint-config-next | 16.4.1  | `latest`                                                   |
| react / react-dom         | 19.3.1  | `latest`                                                   |
| @tanstack/react-query     | 5.104.2 | `latest`                                                   |
| openapi-fetch             | 0.17.0  | `latest`                                                   |
| openapi-typescript        | 7.13.0  | `latest`                                                   |
| typescript                | 5.9.3   | **não é a `latest` (7.0.2)**, ver abaixo                   |
| eslint                    | 9.39.5  | **linha de manutenção, não a `latest` (10.x)**, ver abaixo |
| vitest                    | 5.0.4   | `latest`                                                   |
| jsdom                     | 29.1.1  | **não é a `latest` (30.x)**, ver abaixo                    |
| @playwright/test          | 1.64.1  | `latest`                                                   |
| prettier                  | 3.9.10  | `latest`                                                   |
| tsx                       | 4.23.15 | `latest`; roda o mock e o exemplo de CLI                   |
| Node                      | 22.13+  | `.nvmrc` = 22                                              |

## Fixações forçadas pelo ecossistema

- **TypeScript 5.9.3.** A 7.x é o compilador nativo novo. `openapi-typescript@7.13.0` declara peer `typescript@^5.x`
  e `typescript-eslint@8.71.2`, usado pelo preset do Next, declara `<6.1.0`. A 5.9.3 é a maior versão aceita pelos
  dois. Revisar quando ambos aceitarem a 7.
- **ESLint 9.39.5.** O preset oficial `eslint-config-next@16.4.1` depende de plugins (`eslint-plugin-react`,
  `eslint-plugin-import`, `eslint-plugin-jsx-a11y`) cujo peer vai só até ESLint 9. O npm marca a 9.x como "no longer
  supported". Preferimos o preset oficial, que inclui as regras de acessibilidade, a uma configuração manual na 10.
  Revisar quando o preset aceitar ESLint 10.
- **jsdom 29.1.1.** A 30.x exige Node `^22.22.2 || ^24.15.0 || >=26`. A 29 aceita Node 22.13+, o mínimo deste
  repositório.

## Como atualizar

1. `npm outdated` e, para cada pacote, `npm view <pacote> dist-tags` (não instalar `next`, `rc`, `canary` ou `beta`).
2. Atualize um grupo por vez (framework, SDK, testes, lint), rodando `npm run check` e `npm run e2e` a cada passo.
3. Se o gerador mudar de versão, `npm run generate` vai mudar `src/generated/`. Revise o diff de tipos como se fosse
   mudança de contrato.
