-- Migration corretiva: libera o fluxo público de abertura de Chamado
-- (/chamado), usado por visitantes SEM login (role "anon" do Supabase).
--
-- Não altera nenhuma coluna, tipo ou estrutura de tabela — apenas adiciona
-- políticas de RLS (permissões) que nunca existiram para o papel "anon"
-- nas tabelas envolvidas na criação de um novo chamado. Sem isso, o
-- formulário público de abertura de chamado nunca conseguiu gravar nada
-- no banco, independente do código do front-end.
--
-- É seguro rodar mesmo que parte já exista (idempotente).

-- 1. Permite que um visitante anônimo cadastre um novo cliente ao abrir
--    um chamado pela primeira vez.
GRANT INSERT ON public.clients TO anon;

DROP POLICY IF EXISTS "Allow anon insert clients" ON public.clients;
CREATE POLICY "Allow anon insert clients"
  ON public.clients FOR INSERT TO anon
  WITH CHECK (true);

-- 2. Permite que o visitante crie a Ordem de Serviço referente ao chamado,
--    mas só com status inicial "pendente" (não é possível, via formulário
--    público, criar uma O.S. já aprovada, finalizada, etc.).
GRANT INSERT ON public.orders TO anon;

DROP POLICY IF EXISTS "Allow anon insert orders" ON public.orders;
CREATE POLICY "Allow anon insert orders"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (status = 'pendente' AND budget_status = 'pendente');

-- 3. Permite anexar as fotos/vídeos enviados junto do chamado.
GRANT INSERT ON public.order_media TO anon;

DROP POLICY IF EXISTS "Allow anon insert order_media" ON public.order_media;
CREATE POLICY "Allow anon insert order_media"
  ON public.order_media FOR INSERT TO anon
  WITH CHECK (true);

-- 4. Permite o upload físico dos arquivos de mídia no Storage
--    (bucket "order-media"). Antes só usuários logados podiam enviar.
DROP POLICY IF EXISTS "Allow anon uploads to order-media" ON storage.objects;
CREATE POLICY "Allow anon uploads to order-media"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'order-media');
