-- Migration: sistema de papéis (Admin / Técnico)
--
-- Cria:
--   1) Tabela public.profiles — um perfil por usuário do Supabase Auth,
--      guardando nome e papel (admin | tecnico).
--   2) Coluna orders.assigned_technician_id — para saber qual técnico é
--      responsável por cada O.S.
--   3) Função auxiliar is_admin() — usada nas políticas de RLS abaixo.
--   4) Trigger que cria automaticamente um perfil (papel "tecnico" por
--      padrão) sempre que um novo usuário é criado no Auth.
--   5) Políticas de RLS: técnico só vê/edita as O.S. atribuídas a ele;
--      admin continua com acesso total a tudo.
--
-- IMPORTANTE — leia antes de rodar:
--   Depois de rodar este SQL, o usuário que você já usa hoje para logar
--   (ex: admin@rdsolutions.com.br) via receber automaticamente um perfil
--   com papel "tecnico" (padrão de segurança). Você PRECISA rodar
--   manualmente o comando no passo 6, no final deste arquivo, para
--   promover esse usuário a "admin" — senão ninguém consegue cadastrar
--   técnicos novos nem acessar Relatórios/Empresa.

-- =========================================================================
-- 1. TABELA DE PERFIS
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'tecnico' CHECK (role IN ('admin', 'tecnico')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- 2. COLUNA DE TÉCNICO RESPONSÁVEL NA O.S.
-- =========================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_technician_id uuid REFERENCES public.profiles(id);

-- =========================================================================
-- 3. FUNÇÃO AUXILIAR is_admin()
-- =========================================================================
-- SECURITY DEFINER: roda com privilégios do dono da função, ignorando a
-- própria RLS de "profiles" ao ser consultada de dentro de outra política
-- (evita recursão infinita entre a política de profiles e as demais).

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =========================================================================
-- 4. AUTO-CRIAÇÃO DE PERFIL AO CRIAR USUÁRIO NO AUTH
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tecnico')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Cria perfil para usuários que já existiam ANTES desta migration
-- (ex: seu usuário admin atual), como "tecnico" por padrão — promova
-- manualmente no passo 6 no final deste arquivo.
INSERT INTO public.profiles (id, full_name, role)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'tecnico'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 5. POLÍTICAS DE RLS
-- =========================================================================

-- --- profiles ---
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- --- orders: restringe SELECT/UPDATE para técnico só na O.S. atribuída ---
DROP POLICY IF EXISTS "Allow authenticated full access to orders" ON public.orders;

DROP POLICY IF EXISTS "orders_select" ON public.orders;
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT TO authenticated
  USING (public.is_admin() OR assigned_technician_id = auth.uid());

DROP POLICY IF EXISTS "orders_insert" ON public.orders;
CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR assigned_technician_id = auth.uid())
  WITH CHECK (public.is_admin() OR assigned_technician_id = auth.uid());

DROP POLICY IF EXISTS "orders_delete" ON public.orders;
CREATE POLICY "orders_delete" ON public.orders
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- --- budget_items, order_media, order_status_history: seguem a mesma
--     visibilidade da O.S. à qual pertencem ---
DROP POLICY IF EXISTS "Allow authenticated full access to budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "budget_items_all" ON public.budget_items;
CREATE POLICY "budget_items_all" ON public.budget_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Allow authenticated full access to order_media" ON public.order_media;
DROP POLICY IF EXISTS "order_media_all" ON public.order_media;
CREATE POLICY "order_media_all" ON public.order_media
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Allow authenticated full access to order_status_history" ON public.order_status_history;
DROP POLICY IF EXISTS "order_status_history_all" ON public.order_status_history;
CREATE POLICY "order_status_history_all" ON public.order_status_history
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o WHERE o.id = order_id
      AND (public.is_admin() OR o.assigned_technician_id = auth.uid())
  ));

-- --- clientes e catálogo: continuam visíveis para todos os logados,
--     técnico precisa disso para abrir/orçar chamados ---
-- (nenhuma mudança necessária — já é "authenticated full access")

-- --- company_settings: só admin edita; técnico só lê (não usado na UI
--     dele, mas mantemos leitura por segurança/compatibilidade) ---
DROP POLICY IF EXISTS "Allow authenticated full access to company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_select" ON public.company_settings;
CREATE POLICY "company_settings_select" ON public.company_settings
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "company_settings_write" ON public.company_settings;
CREATE POLICY "company_settings_write" ON public.company_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================================
-- 6. PROMOVA SEU USUÁRIO ATUAL A ADMIN — EXECUTE ISSO MANUALMENTE
-- =========================================================================
-- Troque o e-mail abaixo pelo e-mail que você já usa para logar no painel.

-- UPDATE public.profiles SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@rdsolutions.com.br');
