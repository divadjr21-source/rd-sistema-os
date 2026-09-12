-- Migration corretiva: a tabela contract_invoices no banco real estava
-- sem a coluna reference_year (e possivelmente outras), causando o erro
-- "column contract_invoices.reference_year does not exist" ao marcar um
-- contrato como pago/enviado.
--
-- Isso acontece quando a migration original que criava essa tabela nunca
-- foi executada de fato neste banco (ou foi criada de outra forma antes).
-- Esta migration corrige isso de forma segura (IF NOT EXISTS em tudo),
-- sem apagar nenhum dado existente.

-- Garante que a tabela existe (caso nem isso tenha sido criado).
CREATE TABLE IF NOT EXISTS public.contract_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE
);

-- Adiciona qualquer coluna que esteja faltando.
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS reference_month integer;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS reference_year integer;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS sent_at timestamptz;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.contract_invoices ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Preenche linhas antigas que porventura tenham ficado com mês/ano nulos,
-- usando a data de criação como referência (evita erro ao aplicar o NOT
-- NULL logo abaixo).
UPDATE public.contract_invoices
SET reference_month = COALESCE(reference_month, EXTRACT(MONTH FROM created_at)::integer),
    reference_year = COALESCE(reference_year, EXTRACT(YEAR FROM created_at)::integer)
WHERE reference_month IS NULL OR reference_year IS NULL;

ALTER TABLE public.contract_invoices ALTER COLUMN reference_month SET NOT NULL;
ALTER TABLE public.contract_invoices ALTER COLUMN reference_year SET NOT NULL;

-- Garante a trava de "1 fatura por contrato por mês/ano" (idempotente).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contract_invoices_contract_id_reference_month_reference_year_key'
  ) THEN
    ALTER TABLE public.contract_invoices
      ADD CONSTRAINT contract_invoices_contract_id_reference_month_reference_year_key
      UNIQUE (contract_id, reference_month, reference_year);
  END IF;
END $$;

ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_invoices TO authenticated;

DROP POLICY IF EXISTS "Allow authenticated full access to contract_invoices" ON public.contract_invoices;
CREATE POLICY "Allow authenticated full access to contract_invoices"
  ON public.contract_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
