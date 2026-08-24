-- Migration: guia "Custos/Projetos" — controle de lucratividade por O.S.
--
-- Cria 3 tabelas:
--   1) cost_projects — vincula UMA O.S. a um controle de custos (1:1,
--      garantido pelo UNIQUE em order_id) com o valor do projeto (receita).
--   2) cost_project_purchases — lançamentos de compras/fornecedores.
--   3) cost_project_technician_days — lançamentos de diária de técnico
--      (nome livre, permite diaristas sem login no sistema).
--
-- Acesso restrito a administradores (mesma lógica de Relatórios/Empresa).

CREATE TABLE IF NOT EXISTS public.cost_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  project_value numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cost_project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.cost_projects(id) ON DELETE CASCADE,
  purchase_date date NOT NULL DEFAULT current_date,
  supplier text NOT NULL,
  description text NOT NULL DEFAULT '',
  cost numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cost_project_technician_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.cost_projects(id) ON DELETE CASCADE,
  work_date date NOT NULL DEFAULT current_date,
  technician_name text NOT NULL,
  service_description text NOT NULL DEFAULT '',
  daily_rate numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cost_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_project_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_project_technician_days ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.cost_projects,
  public.cost_project_purchases,
  public.cost_project_technician_days
TO authenticated;

-- Só administradores podem ver ou mexer (usa a função is_admin() já criada
-- na migration de papéis admin/técnico).
DROP POLICY IF EXISTS "cost_projects_admin_only" ON public.cost_projects;
CREATE POLICY "cost_projects_admin_only" ON public.cost_projects
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cost_project_purchases_admin_only" ON public.cost_project_purchases;
CREATE POLICY "cost_project_purchases_admin_only" ON public.cost_project_purchases
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cost_project_technician_days_admin_only" ON public.cost_project_technician_days;
CREATE POLICY "cost_project_technician_days_admin_only" ON public.cost_project_technician_days
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_cost_project_purchases_project ON public.cost_project_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_cost_project_technician_days_project ON public.cost_project_technician_days(project_id);
