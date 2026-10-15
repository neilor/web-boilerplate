# Compatibilidade e versões

Três "versões" diferentes aparecem em projetos com API, SDK e apps. Elas não são a mesma coisa e não devem ser
confundidas:

| O quê                           | Exemplo                            | Quem decide                                        |
| ------------------------------- | ---------------------------------- | -------------------------------------------------- |
| **Versão de caminho da API**    | `/v1/items`, `/v2/items`           | o backend, quando há mudança incompatível de rota  |
| **Versão do contrato / do SDK** | `info.version: 1.4.0`, SDK `1.4.0` | o backend (contrato) e o pacote do SDK que o segue |
| **Versão do app publicado**     | app 3.2.x numa loja                | o time do app; versões antigas continuam em uso    |

Uma quarta coisa também não é "versão da API": a **geração da plataforma de hospedagem** (ex.: uma "2ª geração" de
funções serverless). Trocar de geração de runtime não muda o contrato.

## Regras

1. **O SDK segue o contrato.** Mudança aditiva no contrato (campo opcional novo, rota nova) gera SDK _minor_. Mudança
   incompatível (campo removido, tipo alterado, rota removida) gera SDK _major_.
2. **Mudança incompatível de rota vai para um caminho novo** (`/v2/...`). O caminho antigo continua no contrato e no
   SDK gerado até os consumidores migrarem.
3. **Apps publicados não atualizam sozinhos.** Antes de alterar ou remover uma rota, liste quais versões publicadas
   ainda a chamam e mantenha testes de contrato para essas rotas do lado do backend.
4. **Campos novos em respostas devem ser opcionais para clientes antigos.** Enums que crescem precisam de um ramo
   "desconhecido" na UI.
5. **Erros têm `code` estável.** A UI decide pelo `code`, nunca pelo texto da mensagem.
6. **Deprecação explícita:** marque a operação como `deprecated: true` no contrato. O tipo gerado carrega a marcação e
   o editor avisa quem ainda a usa.

## Neste repositório

- O contrato sintético está em `1.0.0`; a proveniência registra `infoVersion` e o hash.
- `npm run check:generated` no CI garante que o SDK commitado corresponde ao contrato commitado.
- Não há publicação de pacote. Num repositório real, o pacote do SDK teria versionamento próprio (por exemplo, com
  changesets), ligado ao `info.version` do contrato.
