-- Migration corretiva (v2) — mais simples e segura que a anterior.
--
-- A tentativa anterior (20260907000001) falhou porque tentou comparar/
-- combinar valores de tipos diferentes (a coluna reference_month já
-- existia no banco real como texto, não número). Esta versão só garante
-- que as colunas existem, sem tentar preencher dados antigos nem forçar
-- tipo/obrigatoriedade — mais simples, resolve o essencial sem risco de
-- outro erro de tipo.

CREATE TABLE IF NOT EXISTS public.contract_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE
);

ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS reference_month integer;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS reference_year integer;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_invoices TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated full access to contract_invoices" ON public.contract_invoices;
CREATE POLICY "Allow authenticated full access to contract_invoices"
  ON public.contract_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
