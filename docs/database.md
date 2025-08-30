# Estrutura do Banco de Dados (Supabase)

## Tabela: `clientes`

Armazena os dados básicos dos clientes PJ da distribuidora (pré-carregado).

| Coluna          | Tipo      | Descrição                        | Restrições   |
| --------------- | --------- | -------------------------------- | ------------ |
| `cnpj`          | `varchar` | CNPJ do cliente (chave primária) | PK, Not Null |
| `razao_social`  | `varchar` | Razão Social do cliente          | Not Null     |
| `nome_fantasia` | `varchar` | Nome Fantasia do cliente         |              |

## Tabela: `usuarios`

Armazena os dados dos usuários que se cadastraram para participar da campanha.

| Coluna       | Tipo        | Descrição                                       | Restrições                        |
| ------------ | ----------- | ----------------------------------------------- | --------------------------------- |
| `id`         | `uuid`      | ID único do usuário (gerado pelo Supabase Auth) | PK, Default: `uuid_generate_v4()` |
| `whatsapp`   | `varchar`   | Número do WhatsApp para login OTP               | Unique, Not Null                  |
| `nome`       | `varchar`   | Nome do responsável                             | Not Null                          |
| `cpf`        | `varchar`   | CPF do responsável                              | Unique, Not Null                  |
| `cnpj`       | `varchar`   | CNPJ do cliente associado                       | FK (`clientes.cnpj`), Not Null    |
| `created_at` | `timestamp` | Data/Hora de criação do registro                | Default: `now()`                  |
| `role`       | `varchar`   | Papel do usuário (ex: 'cliente', 'admin')       | Default: `'cliente'`              |

_Nota: A coluna `id` deve ser configurada para referenciar `auth.users.id` do Supabase Auth para vincular o registro ao usuário autenticado._

## Tabela: `notas_fiscais`

Armazena os dados das notas fiscais elegíveis para a campanha (pré-carregado).

| Coluna         | Tipo      | Descrição                             | Restrições |
| -------------- | --------- | ------------------------------------- | ---------- |
| `num_nota`     | `varchar` | Número da Nota Fiscal                 | PK         |
| `cnpj`         | `varchar` | CNPJ do cliente emitente/destinatário | Not Null   |
| `valor`        | `numeric` | Valor total da NF                     |            |
| `data_emissao` | `date`    | Data de emissão da NF                 |            |

_Índice sugerido em `(cnpj)` para otimizar a busca de validação._

## Tabela: `cupons`

Armazena os cupons gerados a partir das notas fiscais validadas.

| Coluna       | Tipo        | Descrição                      | Restrições                     |
| ------------ | ----------- | ------------------------------ | ------------------------------ |
| `id`         | `bigint`    | ID único do cupom              | PK, Identity                   |
| `num_nota`   | `varchar`   | Número da NF que gerou o cupom | Not Null                       |
| `cnpj`       | `varchar`   | CNPJ do cliente dono do cupom  | FK (`clientes.cnpj`), Not Null |
| `created_at` | `timestamp` | Data/Hora de geração do cupom  | Default: `now()`               |

_Restrição única (Unique Constraint) sugerida em `(num_nota, cnpj)` para garantir que uma NF gere apenas um cupom por cliente._

## Tabela: `sorteios`

Armazena o histórico dos sorteios realizados.

| Coluna          | Tipo        | Descrição                             | Restrições           |
| --------------- | ----------- | ------------------------------------- | -------------------- |
| `id`            | `bigint`    | ID único do sorteio                   | PK, Identity         |
| `cupom_id`      | `bigint`    | ID do cupom sorteado                  | FK (`cupons.id`)     |
| `data_sorteio`  | `timestamp` | Data/Hora da realização do sorteio    | Default: `now()`     |
| `admin_user_id` | `uuid`      | ID do usuário admin que fez o sorteio | FK (`usuarios.id`)\* |

_Relação com `usuarios.id` onde `role = 'admin'`_
