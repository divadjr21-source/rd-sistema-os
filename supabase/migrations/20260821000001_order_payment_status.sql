-- Migration: adiciona status de pagamento por O.S. (Paga / Aguardando
-- Pagamento), independente do status de execução e do orçamento.
--
-- Não afeta nenhum dado existente: toda O.S. já criada passa a ter
-- payment_status = 'aguardando' por padrão.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'aguardando'
  CHECK (payment_status IN ('aguardando', 'paga'));
