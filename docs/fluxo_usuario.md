# Fluxo do Usuário Cliente

Este documento descreve a jornada do usuário cliente dentro do sistema da campanha promocional.

## 1. Cadastro

**Objetivo:** Permitir que um novo cliente (representante de PJ) se registre na plataforma.

**Pré-requisitos:**

- O CNPJ do cliente deve existir na tabela `clientes`.
- O cliente deve possuir um número de WhatsApp válido.

**Passos:**

1.  **Acesso:** Usuário acessa a página de cadastro (ex: `/cadastro`).
2.  **Entrada de Dados:** Usuário preenche o formulário com:
    - CNPJ
    - Nome completo do responsável
    - CPF do responsável
    - Número de WhatsApp (com DDD)
3.  **Submissão:** Usuário clica em "Cadastrar".
4.  **Validação (Server Action/Function):**
    a. Verifica se todos os campos foram preenchidos corretamente (formato do CNPJ, CPF, WhatsApp).
    b. Consulta a tabela `clientes` para verificar se o `cnpj` informado existe.
    _ **Falha:** Se não existir, exibe mensagem de erro "CNPJ não encontrado ou não participante da campanha."
    c. Verifica se o `cpf` já existe na tabela `usuarios`.
    _ **Falha:** Se existir, exibe mensagem "CPF já cadastrado."
    d. Verifica se o `whatsapp` já existe na tabela `usuarios`. \* **Falha:** Se existir, exibe mensagem "Número de WhatsApp já cadastrado."
    e. **Sucesso:** Se todas as validações passarem:
    i. Chama a função `signUp` do Supabase Auth com o número de WhatsApp e uma senha temporária/gerenciada internamente (ou apenas usa o WhatsApp como identificador para OTP, dependendo da implementação do Supabase).
    ii. Cria um registro na tabela `usuarios` vinculando o `id` do usuário do Supabase Auth (`auth.users.id`) com os dados fornecidos (Nome, CPF, WhatsApp, CNPJ associado).
    iii. Dispara o envio de OTP para o WhatsApp informado via Supabase Auth (`sendOtp`).
5.  **Redirecionamento/Feedback:** Usuário é direcionado para a página de verificação de OTP (ex: `/verificar-otp`) com uma mensagem instruindo a inserir o código recebido no WhatsApp.

## 2. Login

**Objetivo:** Permitir que um usuário já cadastrado acesse sua conta.

**Passos:**

1.  **Acesso:** Usuário acessa a página de login (ex: `/login`).
2.  **Entrada de Dados:** Usuário informa o número de WhatsApp cadastrado.
3.  **Submissão:** Usuário clica em "Entrar" ou "Enviar Código".
4.  **Validação (Server Action/Function):**
    a. Verifica se o número de WhatsApp está em um formato válido.
    b. Verifica se o número de WhatsApp existe na tabela `usuarios`. \* **Falha:** Se não existir, exibe mensagem "Usuário não encontrado."
    c. **Sucesso:** Dispara o envio de OTP para o WhatsApp informado via Supabase Auth (`sendOtp`).
5.  **Redirecionamento/Feedback:** Usuário é direcionado para a página de verificação de OTP (ex: `/verificar-otp`) com uma mensagem instruindo a inserir o código.

## 3. Verificação de OTP (Cadastro e Login)

**Objetivo:** Validar o código OTP recebido pelo usuário.

**Passos:**

1.  **Acesso:** Usuário está na página de verificação (ex: `/verificar-otp`), geralmente após o cadastro ou solicitação de login.
2.  **Entrada de Dados:** Usuário insere o código de 6 dígitos recebido no WhatsApp.
3.  **Submissão:** Usuário clica em "Verificar" ou "Entrar".
4.  **Validação (Server Action/Function):**
    a. Chama a função `verifyOtp` do Supabase Auth com o número de WhatsApp e o código inserido.
    b. **Falha:** Se o OTP for inválido ou expirado, exibe mensagem de erro "Código inválido ou expirado. Tente novamente."
    c. **Sucesso:**
    i. Supabase Auth cria a sessão do usuário.
    ii. O sistema redireciona o usuário para a área logada (dashboard do cliente, ex: `/app/dashboard`).

## 4. Área Logada (Dashboard)

**Páginas Principais:**

- **Submeter Nota Fiscal (ex: `/app/submeter-nf`)**
  1.  Usuário vê um campo para inserir o número da Nota Fiscal.
  2.  Usuário digita o `num_nota` e clica em "Validar" ou "Enviar".
  3.  **Validação (Server Action/Function):**
      a. Obtém o `cnpj` do usuário logado a partir da sessão/tabela `usuarios` (usando helpers do Supabase no servidor).
      b. Busca na tabela `notas_fiscais` por `num_nota` e `cnpj`.
      _ **Falha:** Se não encontrar, exibe "Nota Fiscal não encontrada ou não pertence a este CNPJ."
      c. Busca na tabela `cupons` por `num_nota` e `cnpj`.
      _ **Falha:** Se encontrar, exibe "Esta Nota Fiscal já gerou um cupom."
      d. **Sucesso:**
      i. Insere um novo registro na tabela `cupons` com `num_nota` e `cnpj`.
      ii. Exibe mensagem "Cupom gerado com sucesso!"
- **Meus Cupons (ex: `/app/meus-cupons`)**
  1.  O Server Component da página busca na tabela `cupons` todos os registros correspondentes ao `cnpj` do usuário logado (obtido no servidor).
  2.  Exibe uma lista/tabela com os cupons, mostrando pelo menos o número da nota fiscal (`num_nota`) e a data de geração (`created_at`).
- **Logout**
  1.  Usuário clica no botão/link "Sair" (geralmente em um Client Component para interatividade).
  2.  O Client Component chama uma Server Action que executa a função `signOut` do Supabase Auth no servidor.
  3.  Usuário é redirecionado para a página de login ou inicial.
