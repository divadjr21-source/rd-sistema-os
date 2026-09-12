-- Migration: adiciona um status de pagamento SIMPLES e direto no contrato
-- mensal (igual já existe na O.S.: "Aguardando Pagamento" / "Paga"),
-- editável direto no card, sem depender de datas ou de mês de referência.
--
-- Isso alimenta o card "Cobranças Pendentes" do Dashboard: todo contrato
-- ativo com payment_status = 'aguardando' aparece lá, até o admin marcar
-- como paga. Quando um novo mês começa, o admin volta a marcar
-- "Aguardando Pagamento" manualmente (fluxo simples, sem automação).

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'aguardando'
  CHECK (payment_status IN ('aguardando', 'paga'));
