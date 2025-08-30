-- Arquivo de Seed para popular tabelas do Supabase com dados fictícios

-- Limpar tabelas (opcional, cuidado em produção!)
-- DELETE FROM sorteios;
-- DELETE FROM cupons;
-- DELETE FROM notas_fiscais;
-- DELETE FROM usuarios;
-- DELETE FROM clientes;

-- 1. Clientes
INSERT INTO public.clientes (cnpj, razao_social, nome_fantasia) VALUES
('00000000000101', 'Empresa Fictícia Alpha Ltda', 'Alpha Soluções'),
('00000000000102', 'Comércio Beta S/A', 'Mercado Beta'),
('00000000000103', 'Serviços Gamma Eireli', 'Gamma Tech'),
('00000000000104', 'Indústria Delta Ltda', 'Delta Manufatura'),
('00000000000105', 'Consultoria Epsilon S.A.', 'Epsilon Consultores'),
('00000000000106', 'Varejo Zeta ME', 'Zeta Loja'),
('00000000000107', 'Distribuidora Omega Ltda', 'Omega Entregas'),
('00000000000108', 'Construções Sigma Eireli', 'Sigma Obras'),
('00000000000109', 'Tecnologia Tau S/A', 'Tau Systems'),
('00000000000110', 'Alimentos Kappa Ltda', 'Kappa Food');

-- 2. Usuários (IDs são UUIDs, podem precisar de ajuste para corresponder ao Auth)
INSERT INTO public.usuarios (id, cnpj, cpf, nome, role, whatsapp) VALUES
('00000000-0000-0000-0000-000000000001', '00000000000101', '11111111111', 'Alice Silva', 'cliente', '5511911111111'),
('00000000-0000-0000-0000-000000000002', '00000000000102', '22222222222', 'Bruno Costa', 'cliente', '5521922222222'),
('00000000-0000-0000-0000-000000000003', '00000000000103', '33333333333', 'Carla Dias', 'admin', '5531933333333'),
('00000000-0000-0000-0000-000000000004', '00000000000104', '44444444444', 'Daniel Souza', 'cliente', '5541944444444'),
('00000000-0000-0000-0000-000000000005', '00000000000105', '55555555555', 'Eduarda Lima', 'cliente', '5551955555555'),
('00000000-0000-0000-0000-000000000006', '00000000000106', '66666666666', 'Felipe Martins', 'cliente', '5561966666666'),
('00000000-0000-0000-0000-000000000007', '00000000000107', '77777777777', 'Gabriela Rocha', 'admin', '5571977777777'),
('00000000-0000-0000-0000-000000000008', '00000000000108', '88888888888', 'Heitor Santos', 'cliente', '5581988888888'),
('00000000-0000-0000-0000-000000000009', '00000000000109', '99999999999', 'Isabela Pereira', 'cliente', '5591999999999'),
('00000000-0000-0000-0000-000000000010', '00000000000110', '10101010101', 'João Almeida', 'cliente', '5511910101010');

-- 3. Notas Fiscais (IDs são auto-incrementados pela sequence padrão do Supabase)
-- Depende de Clientes
INSERT INTO public.notas_fiscais (cnpj, num_nota, data_emissao, valor, valida, motivo) VALUES
('00000000000101', 'NF001', '2024-01-15T10:00:00Z', 150.50, true, null),
('00000000000102', 'NF002', '2024-01-16T11:30:00Z', 230.00, true, null),
('00000000000103', 'NF003', '2024-01-17T14:15:00Z', 99.90, false, 'Valor abaixo do mínimo'),
('00000000000101', 'NF004', '2024-01-18T09:05:00Z', 500.00, true, null),
('00000000000104', 'NF005', '2024-01-19T16:40:00Z', 75.25, true, null),
('00000000000105', 'NF006', '2024-01-20T12:00:00Z', 1200.00, true, null),
('00000000000106', 'NF007', '2024-01-21T18:22:00Z', 35.00, false, 'Data fora do período'),
('00000000000107', 'NF008', '2024-01-22T13:10:00Z', 412.70, true, null),
('00000000000108', 'NF009', '2024-01-23T10:55:00Z', 88.88, true, null),
('00000000000102', 'NF010', '2024-01-24T15:00:00Z', 199.99, true, null);

-- 4. Cupons (IDs são auto-incrementados pela sequence padrão do Supabase)
-- Depende de Clientes e Notas Fiscais (usaremos IDs 1 a 10 das notas criadas acima)
INSERT INTO public.cupons (cnpj, num_nota, nota_fiscal_id, sorteado_em) VALUES
('00000000000101', 'NF001', 1, null),
('00000000000102', 'NF002', 2, '2024-02-01T10:00:00Z'), -- Sorteado
('00000000000101', 'NF004', 4, null),
('00000000000104', 'NF005', 5, null),
('00000000000105', 'NF006', 6, null),
('00000000000107', 'NF008', 8, '2024-02-05T14:30:00Z'), -- Sorteado
('00000000000108', 'NF009', 9, null),
('00000000000102', 'NF010', 10, null);

-- 5. Sorteios (IDs são auto-incrementados pela sequence padrão do Supabase)
-- Depende de Cupons e Usuários (admins)
-- Usaremos os IDs dos cupons gerados acima (IDs 2 e 6 foram marcados como sorteados)
-- Usaremos os IDs dos usuários admin ('...0003' e '...0007')
INSERT INTO public.sorteios (cupom_id, admin_user_id, data_sorteio) VALUES
(2, '00000000-0000-0000-0000-000000000003', '2024-02-01T10:00:00Z'),
(6, '00000000-0000-0000-0000-000000000007', '2024-02-05T14:30:00Z');
-- Adicionando mais alguns sorteios fictícios (assumindo que mais cupons foram sorteados)
-- (Supondo que os cupons com IDs 1 e 4 também foram sorteados posteriormente)
INSERT INTO public.sorteios (cupom_id, admin_user_id, data_sorteio) VALUES
(1, '00000000-0000-0000-0000-000000000003', '2024-02-10T11:00:00Z'),
(4, '00000000-0000-0000-0000-000000000007', '2024-02-12T16:00:00Z'); 