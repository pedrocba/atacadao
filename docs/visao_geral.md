# Visão Geral do Projeto: Campanha Promocional Distribuidora

## 1. Objetivo

Desenvolver um sistema web para gerenciar a participação de clientes (pessoas jurídicas) em uma campanha promocional de uma distribuidora de alimentos. O sistema permitirá que os clientes se cadastrem, façam login via WhatsApp (OTP), registrem notas fiscais de compras e recebam cupons para um sorteio. O sistema também incluirá uma funcionalidade administrativa para realizar o sorteio.

## 2. Escopo

- **Cadastro de Clientes:** Clientes (PJ) inserem CNPJ, Nome, CPF do responsável e número de WhatsApp. O CNPJ deve existir previamente em uma base de dados de clientes da distribuidora.
- **Autenticação:** Login seguro utilizando One-Time Password (OTP) enviado via WhatsApp, gerenciado pelo Supabase Auth.
- **Registro de Notas Fiscais:** Clientes logados podem submeter números de notas fiscais.
- **Validação e Geração de Cupons:** O sistema valida se a NF pertence ao cliente e se já não foi utilizada. Cada NF válida e inédita gera 1 cupom para o sorteio.
- **Acompanhamento de Cupons:** Clientes podem visualizar a lista de cupons que já ganharam.
- **Sorteio:** Uma área administrativa restrita permitirá a realização do sorteio com base nos cupons gerados.
- **Tecnologias:** Next.js, Supabase (Auth, Database), Tailwind CSS, Shadcn UI.

## 3. Arquitetura e Abordagem Técnica

- **Server-Centric:** O desenvolvimento priorizará o uso de Server Components, Server Actions e Server Functions do Next.js para manipulação de dados, lógica de negócios e interações com o Supabase.
- **Client Components:** Serão utilizados apenas quando estritamente necessários para interatividade no lado do cliente (ex: manipulação de estado de formulários complexos, animações).
- **API Routes:** Serão evitadas em favor das Server Actions/Functions para simplificar a arquitetura.

## 4. Premissas

- A lista de clientes (CNPJ, Razão Social, Nome Fantasia) estará pré-carregada na tabela `clientes` no Supabase.
- A lista de notas fiscais válidas (Número, CNPJ, Valor, Data Emissão) estará pré-carregada na tabela `notas_fiscais` no Supabase.
- A integração para envio de OTP via WhatsApp será configurada no Supabase Auth.
