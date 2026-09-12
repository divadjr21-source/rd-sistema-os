-- Ajuste pontual (rodar só uma vez): quando a coluna updated_at foi
-- criada, o banco preencheu "agora" pra todas as O.S. já existentes —
-- fazendo elas parecerem "recém-atualizadas" mesmo sendo antigas, o que
-- impedia o Dashboard de escondê-las depois de 3 dias.
--
-- Este ajuste usa a data de abertura (created_at) como referência real
-- pra O.S. que não foram editadas de fato desde a migration anterior.
-- Daqui pra frente, qualquer edição real na O.S. atualiza updated_at
-- corretamente sozinha (via trigger já criado).

UPDATE public.orders
SET updated_at = created_at;
