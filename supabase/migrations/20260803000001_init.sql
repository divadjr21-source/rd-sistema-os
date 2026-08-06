-- Habilita extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de clientes
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (phone)
);

COMMENT ON TABLE public.clients IS 'Base de clientes';

-- 2. Tabela de catálogo
CREATE TABLE IF NOT EXISTS public.catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('material','service')),
  unit_price numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Itens padrão do catálogo
INSERT INTO public.catalog (name, type, unit_price, unit) VALUES
  ('Hora Técnica', 'service', 120, 'h'),
  ('Cabo UTP CAT5e', 'material', 3.5, 'm'),
  ('Conector BNC', 'material', 4.2, 'un'),
  ('Câmera Intelbras', 'material', 289, 'un'),
  ('DVR 4 Canais', 'material', 650, 'un'),
  ('Fonte 12V 10A', 'material', 95, 'un')
ON CONFLICT DO NOTHING;

-- 3. Tabela de ordens de serviço
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_orcamento','aprovado','recusado','em_execucao','finalizado')),
  budget_status text DEFAULT 'pendente' CHECK (budget_status IN ('pendente','aprovado','recusado')),
  budget_approved_at timestamptz,
  budget_rejected_at timestamptz,
  budget_rejection_reason text,
  created_at timestamptz DEFAULT now()
);

-- 4. Tabela de mídias anexadas às ordens
CREATE TABLE IF NOT EXISTS public.order_media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image','video')),
  name text NOT NULL
);

-- 5. Tabela de itens de orçamento
CREATE TABLE IF NOT EXISTS public.budget_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES public.catalog(id) ON DELETE SET NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('material','service')),
  quantity numeric NOT NULL,
  unit_price numeric NOT NULL,
  total numeric NOT NULL
);

-- 6. Configurações da empresa (uma única linha)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name text NOT NULL DEFAULT 'RD Solutions',
  whatsapp text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  logo text
);

INSERT INTO public.company_settings (id, name, whatsapp, address, city)
VALUES (1, 'RD Solutions', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- Políticas de segurança (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Allow authenticated full access to clients"
  ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to catalog"
  ON public.catalog FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to orders"
  ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to order_media"
  ON public.order_media FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to budget_items"
  ON public.budget_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to company_settings"
  ON public.company_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permite leitura anônima para páginas públicas (orçamento aprovado/recusado)
CREATE POLICY "Allow anon read orders"
  ON public.orders FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read budget_items"
  ON public.budget_items FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read clients"
  ON public.clients FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon read company_settings"
  ON public.company_settings FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon update orders budget"
  ON public.orders FOR UPDATE TO anon USING (budget_status = 'pendente') WITH CHECK (budget_status IN ('aprovado','recusado'));

-- Função para gerar número da O.S. de forma sequencial por ano
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger AS $$
DECLARE
  year_int integer;
  count_int integer;
BEGIN
  year_int := EXTRACT(YEAR FROM now());
  SELECT COUNT(*) + 1 INTO count_int
  FROM public.orders
  WHERE EXTRACT(YEAR FROM created_at) = year_int;
  NEW.number := year_int || '-' || LPAD(count_int::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_generate_order_number ON public.orders;
CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_order_number();

-- Trigger para calcular total do item do orçamento
CREATE OR REPLACE FUNCTION public.calculate_budget_item_total()
RETURNS trigger AS $$
BEGIN
  NEW.total := ROUND((NEW.quantity * NEW.unit_price)::numeric, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calculate_budget_item_total ON public.budget_items;
CREATE TRIGGER trg_calculate_budget_item_total
  BEFORE INSERT OR UPDATE ON public.budget_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_budget_item_total();

-- 7. Bucket de storage para mídias (pasta privada com acesso público de leitura)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('order-media', 'order-media', true, false, 52428800, ARRAY['image/*','video/*'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800, allowed_mime_types = ARRAY['image/*','video/*'];

-- Políticas do bucket order-media
CREATE POLICY "Allow authenticated uploads to order-media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-media');

CREATE POLICY "Allow authenticated delete own order-media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'order-media');

CREATE POLICY "Allow public read order-media"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'order-media');

CREATE OR REPLACE FUNCTION public.sync_order_status_from_budget()
RETURNS trigger AS $$
BEGIN
  IF NEW.budget_status = 'aprovado' THEN
    NEW.status := 'em_execucao';
    NEW.budget_approved_at := COALESCE(NEW.budget_approved_at, now());
    NEW.budget_rejected_at := NULL;
  ELSIF NEW.budget_status = 'recusado' THEN
    NEW.status := 'recusado';
    NEW.budget_rejected_at := COALESCE(NEW.budget_rejected_at, now());
    NEW.budget_approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_order_status_from_budget ON public.orders;
CREATE TRIGGER trg_sync_order_status_from_budget
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_order_status_from_budget();
