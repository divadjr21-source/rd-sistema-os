-- Migration: adiciona controle de "última atualização" na O.S.
--
-- Usado para saber há quanto tempo uma O.S. foi finalizada, e assim
-- escondê-la do quadro do Dashboard depois de alguns dias (ela continua
-- existindo normalmente, só não fica mais visível no dia a dia — segue
-- disponível em Relatórios).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Reaproveita a função já usada em outras tabelas (idempotente).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
