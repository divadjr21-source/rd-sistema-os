-- Migration: adiciona CNPJ nos dados da empresa, usado no Recibo de
-- Pagamento e na proposta de orçamento público.

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS cnpj text NOT NULL DEFAULT '47.958.906/0001-87';

-- Garante que a linha de configuração já existente também receba o valor
-- (o DEFAULT acima só vale para linhas novas; a empresa já tem 1 linha).
UPDATE public.company_settings
SET cnpj = '47.958.906/0001-87'
WHERE id = 1 AND (cnpj IS NULL OR cnpj = '');
