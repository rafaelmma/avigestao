# Roteiro de Implementação Backend (AviGestão)

Para transformar o AviGestão em um sistema multi-usuário com dados reais, siga este roteiro utilizando o **Supabase** (a melhor opção para React + Vercel).

## Passo 1: Criar o Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta.
2. Crie um novo projeto chamado `avigestao`.
3. Anote a `SUPABASE_URL` e a `SUPABASE_ANON_KEY` (você precisará delas no Vercel).

## Passo 2: Criar o Banco de Dados (Schema)

Vá até a aba "SQL Editor" no Supabase e cole o código abaixo para criar todas as tabelas necessárias:

```sql
-- 1. Tabela de Perfil do Criador (Extensão da tabela auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  breeder_name text,
  sispass_number text,
  plan text default 'Básico',
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabela de Aves (Plantel)
create table public.birds (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  ring_number text not null,
  name text not null,
  species text not null,
  sex text, -- 'Macho', 'Fêmea', 'Indeterminado'
  birth_date date,
  status text default 'Ativo',
  father_id uuid references public.birds(id), -- Auto-relacionamento
  mother_id uuid references public.birds(id),
  deleted_at timestamp with time zone, -- Para Lixeira (Soft Delete)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabela de Casais
create table public.pairs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null, -- Ex: Box 01
  male_id uuid references public.birds(id),
  female_id uuid references public.birds(id),
  start_date date,
  end_date date,
  status text default 'Ativo',
  deleted_at timestamp with time zone
);

-- 4. Tabela de Ninhadas (Clutches)
create table public.clutches (
  id uuid default uuid_generate_v4() primary key,
  pair_id uuid references public.pairs(id) not null,
  lay_date date not null,
  egg_count int default 0,
  fertile_count int default 0,
  hatched_count int default 0,
  notes text
);

-- 5. Tabela Financeira
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  description text not null,
  amount numeric(10,2) not null,
  type text not null, -- 'Receita' ou 'Despesa'
  category text,
  date date not null,
  deleted_at timestamp with time zone
);

-- 6. Tabela de Medicamentos
create table public.medications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  type text,
  expiry_date date,
  stock int default 0,
  batch text,
  deleted_at timestamp with time zone
);

-- Configurar Segurança (RLS - Row Level Security)
-- Isso garante que um usuário só veja os SEUS próprios dados
alter table public.profiles enable row level security;
alter table public.birds enable row level security;
alter table public.pairs enable row level security;
alter table public.transactions enable row level security;

-- Exemplo de política de segurança (Criar para todas as tabelas):
create policy "Usuários podem ver apenas suas próprias aves"
on public.birds for select
using ( auth.uid() = user_id );

create policy "Usuários podem inserir suas próprias aves"
on public.birds for insert
with check ( auth.uid() = user_id );
```

## Passo 3: Conectar o Frontend

1. Instale o cliente do Supabase no seu projeto:
   `npm install @supabase/supabase-js`

2. Crie um arquivo `src/lib/supabase.ts` para inicializar a conexão.

3. Refatore o `App.tsx`:
   - Remova todo o código de `localStorage`.
   - Use `supabase.auth.signInWithPassword` para o Login.
   - Use `supabase.from('birds').select('*')` para carregar dados.

## Passo 4: Conta de Administrador

No Supabase, a "Conta de Administrador" é gerenciada na aba **Authentication**.

1. Você não precisa criar uma tabela de admins manual.
2. Basta criar um usuário com seu email/senha na aba Auth ou pelo seu próprio App na tela de registro.
3. Esse usuário terá um `user_id` único que será usado para "carimbar" todas as aves e dados criados, garantindo que só ele veja esses dados.

## Resumo da Migração

1. **Hoje:** `App.tsx` usa `useState` e `localStorage`.
2. **Futuro:** `App.tsx` usará `useEffect` para chamar a API do Supabase e popular o estado.
