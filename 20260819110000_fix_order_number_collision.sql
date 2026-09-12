-- Migration corretiva: elimina a duplicidade no número da Ordem de Serviço
-- (erro "duplicate key value violates unique constraint orders_number_key").
--
-- CAUSA RAIZ: a função generate_order_number() gerava o número contando
-- quantas O.S. já existiam no ano (COUNT(*) + 1). Isso falha em dois
-- cenários comuns:
--   1) Se qualquer O.S. já foi excluída, a contagem "recua" e volta a
--      gerar um número que já tinha sido usado antes.
--   2) Duas O.S. sendo criadas ao mesmo tempo (ex: um chamado público
--      chegando junto de uma criação manual no painel) podem ler a mesma
--      contagem e gerar o mesmo número.
--
-- CORREÇÃO: substitui a contagem por um contador dedicado por ano, com
-- trava de linha (FOR UPDATE), que é a forma segura no Postgres de gerar
-- sequências sem risco de colisão mesmo com inserções simultâneas.
--
-- Não altera a tabela `orders` nem nenhuma coluna existente — apenas cria
-- uma tabela auxiliar de controle e substitui a função/trigger.

CREATE TABLE IF NOT EXISTS public.order_number_counters (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- Garante que o contador do ano atual comece pelo maior número já
-- utilizado (evita colidir com O.S. já existentes, como a #2026-0011).
INSERT INTO public.order_number_counters (year, last_number)
SELECT
  EXTRACT(YEAR FROM created_at)::integer AS year,
  MAX(split_part(number, '-', 2)::integer) AS last_number
FROM public.orders
WHERE number ~ '^\d{4}-\d{4}$'
GROUP BY EXTRACT(YEAR FROM created_at)::integer
ON CONFLICT (year) DO UPDATE
  SET last_number = GREATEST(public.order_number_counters.last_number, EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger AS $$
DECLARE
  year_int integer;
  next_number integer;
BEGIN
  year_int := EXTRACT(YEAR FROM now());

  -- Upsert atômico: cria a linha do ano se não existir, ou incrementa se
  -- já existir — tudo em uma única operação travada pelo Postgres, sem
  -- brecha para duas inserções simultâneas lerem o mesmo valor.
  INSERT INTO public.order_number_counters (year, last_number)
  VALUES (year_int, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_number = public.order_number_counters.last_number + 1
  RETURNING last_number INTO next_number;

  NEW.number := year_int || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

GRANT SELECT, INSERT, UPDATE ON public.order_number_counters TO authenticated, anon;
