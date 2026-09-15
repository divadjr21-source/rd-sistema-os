-- Migration: permite ocultar manualmente uma O.S. do quadro do Dashboard,
-- sem excluí-la do banco nem escondê-la de Relatórios.
--
-- Substitui a tentativa anterior (baseada em 3 dias automáticos), que
-- ficou complicada de calcular certo. Agora é simples e direto: um botão
-- no card, o admin decide quando ocultar.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS hidden_from_dashboard boolean NOT NULL DEFAULT false;
