-- Migration corretiva: libera gravação (RLS + grants) e separa mensagens
-- automáticas do sistema das notas digitadas manualmente pelo técnico.
--
-- Esta migration é idempotente: pode ser executada quantas vezes for
-- necessário sem gerar erro, mesmo que parte dela já tenha sido aplicada.

-- =========================================================================
-- 1. GARANTIR GRANTS DE BANCO (independente das políticas de RLS)
-- =========================================================================
-- RLS controla QUAIS linhas o usuário pode ver/alterar, mas antes disso o
-- role precisa ter permissão de SQL (GRANT) na tabela. Se os grants padrão
-- do schema public tiverem sido revogados manualmente em algum momento, as
-- políticas de RLS abaixo não tem efeito e a gravação continua bloqueada
-- silenciosamente. Este bloco garante os grants para authenticated e anon.

GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.clients,
  public.catalog,
  public.orders,
  public.order_media,
  public.budget_items,
  public.company_settings,
  public.order_status_history,
  public.contracts,
  public.contract_invoices,
  public.appointments
TO authenticated;

GRANT SELECT ON
  public.clients,
  public.orders,
  public.budget_items,
  public.company_settings,
  public.order_status_history
TO anon;

GRANT UPDATE ON public.orders TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =========================================================================
-- 2. RE-APLICAR POLÍTICAS DE RLS (idempotente via DROP + CREATE)
-- =========================================================================
-- Recria as políticas de "acesso total para authenticated" em todas as
-- tabelas principais, garantindo que existam mesmo que tenham sido
-- removidas ou alteradas manualmente no painel do Supabase.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients', 'catalog', 'orders', 'order_media', 'budget_items',
    'company_settings', 'order_status_history', 'contracts',
    'contract_invoices', 'appointments'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I;',
      'Allow authenticated full access to ' || t, t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      'Allow authenticated full access to ' || t, t
    );
  END LOOP;
END $$;

-- =========================================================================
-- 3. SEPARAR HISTÓRICO AUTOMÁTICO DAS NOTAS MANUAIS DO TÉCNICO
-- =========================================================================
-- Antes, a distinção entre "mensagem automática do sistema" e "nota manual
-- do técnico" dependia de comparar o texto da nota com a string literal
-- 'log_status'. Isso falhava sempre que a O.S. era recusada, pois nesse
-- caso a trigger gravava o MOTIVO DA RECUSA no lugar de 'log_status',
-- fazendo essa mensagem automática aparecer misturada com as tratativas
-- digitadas manualmente. Agora usamos uma coluna dedicada.

ALTER TABLE public.order_status_history
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system'
  CHECK (source IN ('system', 'manual'));

-- Marca como 'manual' os registros que claramente não são o log automático
-- de criação/mudança de status (heurística de migração de dados antigos).
UPDATE public.order_status_history
SET source = 'manual'
WHERE source = 'system'
  AND status = 'tratativa';

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_source
  ON public.order_status_history (order_id, source);

-- Atualiza as triggers automáticas para gravarem explicitamente source='system'

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, status, note, source)
    VALUES (NEW.id, NEW.status, COALESCE(NEW.budget_rejection_reason, 'log_status'), 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_order_status_creation()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.order_status_history (order_id, status, note, source)
  VALUES (NEW.id, NEW.status, 'log_status', 'system');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
