-- Migration: guia "Relatórios Técnicos" — relatório profissional por O.S.,
-- com fotos, editável como rascunho, gerado em PDF e compartilhável por
-- WhatsApp via link público de visualização.

CREATE TABLE IF NOT EXISTS public.technical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  report_number text UNIQUE,
  title text NOT NULL DEFAULT '',
  work_performed text NOT NULL DEFAULT '',
  observations text NOT NULL DEFAULT '',
  technician_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technical_report_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.technical_reports(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.technical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_report_photos ENABLE ROW LEVEL SECURITY;

-- Garante que a função existe (idempotente), sem depender de ela já ter
-- sido criada por uma migration anterior.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualiza automaticamente updated_at.
DROP TRIGGER IF EXISTS trg_technical_reports_updated_at ON public.technical_reports;
CREATE TRIGGER trg_technical_reports_updated_at
  BEFORE UPDATE ON public.technical_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- NUMERAÇÃO SEGURA DO RELATÓRIO (mesmo padrão à prova de duplicidade usado
-- para o número da O.S. — evita colisão mesmo com relatórios simultâneos).
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.report_number_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.generate_report_number()
RETURNS trigger AS $$
DECLARE
  year_int integer;
  next_number integer;
BEGIN
  year_int := EXTRACT(YEAR FROM now());
  INSERT INTO public.report_number_counters (year, last_number)
  VALUES (year_int, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.report_number_counters.last_number + 1
  RETURNING last_number INTO next_number;

  NEW.report_number := 'RT-' || year_int || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_report_number ON public.technical_reports;
CREATE TRIGGER trg_generate_report_number
  BEFORE INSERT ON public.technical_reports
  FOR EACH ROW
  WHEN (NEW.report_number IS NULL)
  EXECUTE FUNCTION public.generate_report_number();

GRANT SELECT, INSERT, UPDATE ON public.report_number_counters TO authenticated;

-- =========================================================================
-- PERMISSÕES
-- =========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_report_photos TO authenticated;

-- Só administradores criam/editam/excluem relatórios pelo painel.
DROP POLICY IF EXISTS "technical_reports_admin_all" ON public.technical_reports;
CREATE POLICY "technical_reports_admin_all" ON public.technical_reports
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "technical_report_photos_admin_all" ON public.technical_report_photos;
CREATE POLICY "technical_report_photos_admin_all" ON public.technical_report_photos
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Leitura pública (sem login) para a página de visualização compartilhada
-- por link/WhatsApp — mesmo modelo já usado na proposta de orçamento
-- pública (/orcamento/[id]).
GRANT SELECT ON public.technical_reports TO anon;
GRANT SELECT ON public.technical_report_photos TO anon;

DROP POLICY IF EXISTS "technical_reports_public_read" ON public.technical_reports;
CREATE POLICY "technical_reports_public_read" ON public.technical_reports
  FOR SELECT TO anon USING (status = 'finalizado');

DROP POLICY IF EXISTS "technical_report_photos_public_read" ON public.technical_report_photos;
CREATE POLICY "technical_report_photos_public_read" ON public.technical_report_photos
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.technical_reports r
      WHERE r.id = report_id AND r.status = 'finalizado'
    )
  );

CREATE INDEX IF NOT EXISTS idx_technical_reports_order ON public.technical_reports(order_id);
CREATE INDEX IF NOT EXISTS idx_technical_report_photos_report ON public.technical_report_photos(report_id);
