drop policy "Allow admins to insert NFs" on "public"."notas_fiscais";

alter table "public"."clientes" drop constraint "clientes_cnpj_check";

alter table "public"."notas_fiscais" drop constraint "notas_fiscais_cnpj_fkey";

alter table "public"."usuarios" drop constraint "usuarios_role_check";

alter table "public"."clientes" add column "excluido" boolean default false;

alter table "public"."notas_fiscais" add column "qtd_fornecedores" numeric;

alter table "public"."notas_fiscais" add column "codfilial" character varying not null;

alter table "public"."usuarios" alter column "cnpj" drop not null;

CREATE UNIQUE INDEX notas_fiscais_num_nota_key ON public.notas_fiscais USING btree (num_nota);

alter table "public"."notas_fiscais" add constraint "notas_fiscais_num_nota_key" UNIQUE using index "notas_fiscais_num_nota_key";

alter table "public"."notas_fiscais" add constraint "notas_fiscais_cnpj_fkey" FOREIGN KEY (cnpj) REFERENCES clientes(cnpj) not valid;

alter table "public"."notas_fiscais" validate constraint "notas_fiscais_cnpj_fkey";

alter table "public"."usuarios" add constraint "usuarios_role_check" CHECK (((role)::text = ANY ((ARRAY['cliente'::character varying, 'admin'::character varying])::text[]))) not valid;

alter table "public"."usuarios" validate constraint "usuarios_role_check";

create policy "Enable update for users based on cnpj"
on "public"."notas_fiscais"
as permissive
for update
to public
using (((cnpj)::text = (( SELECT usuarios.cnpj
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))::text))
with check (((cnpj)::text = (( SELECT usuarios.cnpj
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))::text));


create policy "Insert NFs"
on "public"."notas_fiscais"
as permissive
for insert
to public
with check (((( SELECT usuarios.role
   FROM usuarios
  WHERE (usuarios.id = auth.uid())))::text = 'admin'::text));



