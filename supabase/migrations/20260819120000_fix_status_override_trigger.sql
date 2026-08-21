-- Migration corretiva: impede que o status da O.S. seja forçado de volta
-- para "Em Execução" (ou "Recusado") toda vez que qualquer campo da O.S.
-- é atualizado.
--
-- CAUSA RAIZ: a trigger sync_order_status_from_budget() rodava em TODA
-- atualização da tabela orders e reforçava o status com base no valor
-- ATUAL de budget_status — mesmo quando budget_status não tinha mudado
-- naquela operação. Resultado: uma O.S. com orçamento já aprovado nunca
-- conseguia ter o status alterado manualmente (ex: para "Finalizado"),
-- porque a trigger sempre devolvia "Em Execução" por cima da escolha do
-- técnico.
--
-- CORREÇÃO: a trigger agora só atua quando budget_status de fato MUDOU
-- nesta operação (comparando com o valor anterior), deixando qualquer
-- outra atualização (incluindo mudança manual de status) intacta.
--
-- Não altera nenhuma coluna ou tabela — apenas a lógica da trigger.

CREATE OR REPLACE FUNCTION public.sync_order_status_from_budget()
RETURNS trigger AS $$
BEGIN
  -- Só age quando o orçamento muda de estado NESTA operação, nunca por
  -- causa de um valor que já estava salvo de antes.
  IF NEW.budget_status IS DISTINCT FROM OLD.budget_status THEN
    IF NEW.budget_status = 'aprovado' THEN
      NEW.status := 'em_execucao';
      NEW.budget_approved_at := COALESCE(NEW.budget_approved_at, now());
      NEW.budget_rejected_at := NULL;
    ELSIF NEW.budget_status = 'recusado' THEN
      NEW.status := 'recusado';
      NEW.budget_rejected_at := COALESCE(NEW.budget_rejected_at, now());
      NEW.budget_approved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- A trigger já existe (BEFORE UPDATE), só precisamos substituir a função
-- acima; nenhuma alteração adicional é necessária aqui.
