-- Migration: adiciona controle de PAGAMENTO nas faturas de contratos
-- mensais, separado do controle de "NF enviada" que já existia.
--
-- Antes só existia sent_at (a NF foi mandada pro cliente?). Agora também
-- existe paid_at (o cliente pagou esse mês?), usado para alimentar o card
-- "Cobranças Pendentes" no Dashboard quando o dia de vencimento passa sem
-- o pagamento ser marcado.

ALTER TABLE public.contract_invoices
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;
