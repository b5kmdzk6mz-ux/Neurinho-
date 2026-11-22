-- =====================================================================
-- Sinapse: banco de dados da nuvem (Supabase)
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar de novo sem problema.
-- =====================================================================

-- ---------- Tabelas ----------
create table if not exists public.folders (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.notebooks (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  data jsonb not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.pages (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  nb text not null,
  data jsonb not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.cards (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  nb text not null,
  data jsonb not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
-- quem tem acesso a um caderno de outra pessoa
create table if not exists public.members (
  nb text not null,
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('view','comment','edit')),
  name text,
  created_at timestamptz not null default now(),
  primary key (nb, user_id)
);
-- links de compartilhamento
create table if not exists public.shares (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  nb text not null,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('view','comment','edit')),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.comments (
  id text primary key,
  nb text not null,
  page text not null,
  author uuid not null default auth.uid() references auth.users on delete cascade,
  author_name text,
  body text not null,
  resolved boolean not null default false,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pages_nb on public.pages (nb);
create index if not exists pages_updated on public.pages (updated_at);
create index if not exists notebooks_updated on public.notebooks (updated_at);
create index if not exists cards_updated on public.cards (updated_at);
create index if not exists folders_updated on public.folders (updated_at);
create index if not exists comments_nb on public.comments (nb, updated_at);
create index if not exists members_user on public.members (user_id);

-- ---------- Hora do servidor em toda gravação (a sincronização usa isso) ----------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
do $$ declare t text; begin
  foreach t in array array['folders','notebooks','pages','cards','comments'] loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------- Funções de acesso (security definer evita recursão nas regras) ----------
create or replace function public.nb_owner(p_nb text) returns uuid
language sql stable security definer set search_path = public as $$
  select owner from public.notebooks where id = p_nb
$$;
-- 'owner', 'edit', 'comment', 'view' ou null
create or replace function public.nb_role(p_nb text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.notebooks where id = p_nb and owner = auth.uid()) then 'owner'
    else (select role from public.members where nb = p_nb and user_id = auth.uid())
  end
$$;

-- a página sempre pertence a quem é dono do caderno (mesmo se outra pessoa a criou)
create or replace function public.page_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid; begin
  o := public.nb_owner(new.nb);
  if o is not null then new.owner := o; end if;
  return new;
end $$;
drop trigger if exists page_owner on public.pages;
create trigger page_owner before insert on public.pages for each row execute function public.page_owner();

-- entrar num caderno compartilhado pelo link
create or replace function public.join_share(p_token text) returns json
language plpgsql security definer set search_path = public as $$
declare s public.shares;
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  select * into s from public.shares where token = p_token and not revoked;
  if not found then raise exception 'link inválido ou desativado'; end if;
  if s.owner = auth.uid() then return json_build_object('nb', s.nb, 'role', 'owner'); end if;
  insert into public.members (nb, user_id, role, name)
    values (s.nb, auth.uid(), s.role, coalesce(auth.jwt() ->> 'email', ''))
    on conflict (nb, user_id) do update set role = excluded.role;
  -- toca nas páginas e no caderno para a sincronização de quem entrou trazer tudo
  return json_build_object('nb', s.nb, 'role', s.role);
end $$;

-- ---------- Regras de segurança (RLS) ----------
alter table public.folders enable row level security;
alter table public.notebooks enable row level security;
alter table public.pages enable row level security;
alter table public.cards enable row level security;
alter table public.members enable row level security;
alter table public.shares enable row level security;
alter table public.comments enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('folders','notebooks','pages','cards','members','shares','comments') loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- pastas e cartões de estudo: só da própria pessoa
create policy folders_own on public.folders for all using (owner = auth.uid()) with check (owner = auth.uid());
create policy cards_own on public.cards for all using (owner = auth.uid()) with check (owner = auth.uid());

-- cadernos: dono faz tudo; membros leem; quem edita pode atualizar
create policy nb_select on public.notebooks for select using (owner = auth.uid() or public.nb_role(id) is not null);
create policy nb_insert on public.notebooks for insert with check (owner = auth.uid());
create policy nb_update on public.notebooks for update using (public.nb_role(id) in ('owner','edit')) with check (public.nb_role(id) in ('owner','edit'));
create policy nb_delete on public.notebooks for delete using (owner = auth.uid());

-- páginas: seguem o caderno
-- (uma página cujo caderno ainda não subiu fica visível só para quem a criou)
create policy pg_select on public.pages for select using (public.nb_role(nb) is not null or (public.nb_owner(nb) is null and owner = auth.uid()));
create policy pg_insert on public.pages for insert with check (public.nb_role(nb) in ('owner','edit') or (public.nb_owner(nb) is null and owner = auth.uid()));
create policy pg_update on public.pages for update using (public.nb_role(nb) in ('owner','edit') or (public.nb_owner(nb) is null and owner = auth.uid()))
  with check (public.nb_role(nb) in ('owner','edit') or (public.nb_owner(nb) is null and owner = auth.uid()));
create policy pg_delete on public.pages for delete using (public.nb_role(nb) = 'owner' or (public.nb_owner(nb) is null and owner = auth.uid()));

-- membros: a pessoa vê as próprias entradas; o dono vê e remove todas
create policy mb_select on public.members for select using (user_id = auth.uid() or public.nb_owner(nb) = auth.uid());
create policy mb_delete on public.members for delete using (user_id = auth.uid() or public.nb_owner(nb) = auth.uid());
create policy mb_update on public.members for update using (public.nb_owner(nb) = auth.uid()) with check (public.nb_owner(nb) = auth.uid());

-- links: só o dono do caderno cria e vê
create policy sh_all on public.shares for all using (owner = auth.uid()) with check (owner = auth.uid() and public.nb_owner(nb) = auth.uid());

-- comentários: quem tem acesso lê; dono, editor e comentarista escrevem
create policy cm_select on public.comments for select using (public.nb_role(nb) is not null);
create policy cm_insert on public.comments for insert with check (author = auth.uid() and public.nb_role(nb) in ('owner','edit','comment'));
create policy cm_update on public.comments for update using (author = auth.uid() or public.nb_role(nb) = 'owner') with check (public.nb_role(nb) is not null);

-- ---------- Cópia dos arquivos dentro do banco ----------
-- O Sinapse dentro do Claude fala com o Supabase pelo conector, que só enxerga o banco
-- (não os arquivos do Storage). Por isso fotos e fundos de PDF também ficam aqui,
-- em pedaços de texto (base64). O Storage continua sendo usado pelo app instalado.
create table if not exists public.blobs (
  id text not null,
  part int not null default 0,
  parts int not null default 1,
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  nb text,
  mime text not null default 'application/octet-stream',
  b64 text not null,
  updated_at timestamptz not null default now(),
  primary key (id, part)
);
alter table public.blobs enable row level security;
drop policy if exists bl_select on public.blobs;
drop policy if exists bl_write on public.blobs;
drop policy if exists bl_update on public.blobs;
drop policy if exists bl_delete on public.blobs;
create policy bl_select on public.blobs for select using (owner = auth.uid() or (nb is not null and public.nb_role(nb) is not null));
create policy bl_write on public.blobs for insert with check (owner = auth.uid() and (nb is null
  or coalesce(public.nb_role(nb), case when public.nb_owner(nb) is null then 'owner' end) in ('owner','edit')));
create policy bl_update on public.blobs for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy bl_delete on public.blobs for delete using (owner = auth.uid());

-- ---------- Permissões (projetos novos do Supabase não liberam as tabelas sozinhos) ----------
-- só quem entrou na conta; as regras acima decidem o que cada pessoa vê
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.folders, public.notebooks, public.pages, public.cards,
  public.members, public.shares, public.comments, public.blobs to authenticated;
grant execute on function public.nb_owner(text), public.nb_role(text), public.join_share(text) to authenticated;

-- ---------- Arquivos (PDFs, fotos, áudios) ----------
-- caminho: <caderno>/<arquivo> ou u/<usuário>/<arquivo> (imagens dos cartões)
insert into storage.buckets (id, name, public) values ('sinapse', 'sinapse', false) on conflict (id) do nothing;
drop policy if exists sinapse_read on storage.objects;
drop policy if exists sinapse_write on storage.objects;
drop policy if exists sinapse_update on storage.objects;
create policy sinapse_read on storage.objects for select using (bucket_id = 'sinapse' and (
  (split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = auth.uid()::text)
  or public.nb_role(split_part(name, '/', 1)) is not null));
create policy sinapse_write on storage.objects for insert with check (bucket_id = 'sinapse' and (
  (split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = auth.uid()::text)
  or coalesce(public.nb_role(split_part(name, '/', 1)), case when public.nb_owner(split_part(name, '/', 1)) is null then 'owner' end) in ('owner','edit')));
create policy sinapse_update on storage.objects for update using (bucket_id = 'sinapse' and (
  (split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = auth.uid()::text)
  or public.nb_role(split_part(name, '/', 1)) in ('owner','edit')));

-- ---------- Tempo real (colaboração) ----------
do $$ declare t text; begin
  foreach t in array array['notebooks','pages','comments','members'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null; end;
  end loop;
end $$;
