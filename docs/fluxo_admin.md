# Fluxo do Usuário Administrador

Este documento descreve as funcionalidades disponíveis para usuários com permissão de administrador.

## 1. Autenticação e Acesso

- **Login:** O administrador utiliza o mesmo fluxo de login via WhatsApp OTP que os clientes comuns (informando o número de WhatsApp e verificando o código).
- **Autorização:** Após o login, o sistema verifica o campo `role` na tabela `usuarios` associada ao usuário autenticado. Se `role` for igual a `'admin'`, o acesso às rotas administrativas é concedido.
- **Rotas:** As funcionalidades administrativas estarão em rotas prefixadas, por exemplo, `/admin/*`.
- **Proteção:** O `middleware.ts` (ou lógica equivalente no Next.js 13+ com App Router) deve ser configurado para:
  1.  Verificar se o usuário está autenticado (usando helpers do Supabase no middleware).
  2.  Buscar o `role` do usuário autenticado na tabela `usuarios`.
  3.  Redirecionar usuários não autorizados para uma página apropriada (página inicial, página de login ou página de acesso negado).

## 2. Tela de Sorteio (ex: `/admin/sorteio`)

**Objetivo:** Permitir que o administrador realize o sorteio dos cupons gerados pelos clientes.

**Funcionalidades:**

- **Visualização:**
  - Exibir o número total de cupons elegíveis (registros na tabela `cupons` que ainda não foram sorteados, caso haja controle de cupons já sorteados).
  - Opcional: Listar todos os cupons participantes.
- **Ação de Sortear:**
  1.  Admin define a quantidade de cupons a serem sorteados (ex: um campo numérico para inserir '1', '5', etc.).
  2.  Admin clica no botão "Realizar Sorteio".
  3.  **Processamento (Server Action/Function):**
      a. Busca todos os `id`s de cupons elegíveis na tabela `cupons` (considerar apenas os não sorteados, se aplicável).
      b. Seleciona aleatoriamente a quantidade de `id`s definida pelo admin a partir da lista de elegíveis.
      c. Para cada `id` de cupom sorteado:
      i. Busca os detalhes do cupom (incluindo `cnpj` e `num_nota`).
      ii. Busca os detalhes do cliente associado (usando o `cnpj` para consultar `clientes` e/ou `usuarios`).
      iii. **Opcional:** Registra o resultado na tabela `sorteios` (associando o `cupom_id`, `data_sorteio` e o `admin_user_id`).
      iv. **Opcional:** Atualiza o cupom na tabela `cupons` para marcá-lo como sorteado (adicionar um campo `sorteado_em` timestamp ou `foi_sorteado` boolean).
  4.  **Exibição do Resultado:**
      - A interface exibe claramente os cupons sorteados, mostrando informações relevantes como:
        - Número do Cupom (ID ou Nota Fiscal associada)
        - CNPJ do Ganhador
        - Razão Social / Nome Fantasia do Ganhador
        - Nome / CPF do Responsável (da tabela `usuarios`)
        - Data/Hora do Sorteio
- **Histórico de Sorteios (Opcional, ex: `/admin/sorteios-anteriores`)**
  - Se a tabela `sorteios` for implementada, esta tela (renderizada como Server Component) listaria os sorteios passados, buscando os dados no servidor.

## 3. Outras Funcionalidades Administrativas (Possíveis)

Dependendo da necessidade, outras telas podem ser adicionadas:

- **Gerenciamento de Usuários:** Visualizar, editar (ex: mudar role), ou desativar usuários.
- **Gerenciamento de Clientes:** Visualizar/editar dados da tabela `clientes`.
- **Gerenciamento de NFs:** Visualizar/gerenciar dados da tabela `notas_fiscais`.
- **Visualização Geral de Cupons:** Ver todos os cupons gerados, com filtros.
