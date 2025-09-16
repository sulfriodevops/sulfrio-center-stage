-- Adicionar as tabelas que estão faltando nos tipos do Supabase
-- Tabela multi_produtos (já existe baseada nos logs)
-- Tabela simultaneidade
CREATE TABLE IF NOT EXISTS public.simultaneidade (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  valor NUMERIC NOT NULL
);

-- Tabela simultaneidade_vrf  
CREATE TABLE IF NOT EXISTS public.simultaneidade_vrf (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  valor NUMERIC(5, 2) NOT NULL CHECK (valor > 0)
);

-- Tabela vrf_cond_produtos (já existe baseada nos logs)
-- Tabela vrf_evap_produtos (já existe baseada nos logs)