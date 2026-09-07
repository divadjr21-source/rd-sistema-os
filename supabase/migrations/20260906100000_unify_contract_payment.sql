-- Migration: unifica o controle de pagamento de contratos mensais.
--
-- Antes existiam DOIS controles separados e sem comunicação entre si:
--   1) contract_invoices.paid_at — por mês/ano (usado em "Alertas de NF")
--   2) contracts.payment_status — flag simples (usado em "Cobranças
--      Pendentes"), que não resetava sozinho todo mês.
--
-- Esta migration remove o (2), deixando o (1) como única fonte da
-- verdade — mais correto para um contrato recorrente, já que cada mês
-- naturalmente "nasce" como não pago, sem precisar lembrar de resetar
-- manualmente.

ALTER TABLE public.contracts DROP COLUMN IF EXISTS payment_status;
