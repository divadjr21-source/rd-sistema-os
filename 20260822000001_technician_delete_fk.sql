-- Migration: permite excluir um técnico mesmo que ele tenha O.S.
-- atribuídas a ele. Sem isso, o banco bloquearia a exclusão com um erro
-- de integridade referencial.
--
-- Ao excluir um técnico, as O.S. que estavam atribuídas a ele voltam a
-- ficar "sem técnico" (assigned_technician_id = NULL) — elas não somem,
-- só passam a aparecer somente para administradores até serem
-- reatribuídas a outro técnico.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_assigned_technician_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_assigned_technician_id_fkey
  FOREIGN KEY (assigned_technician_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
