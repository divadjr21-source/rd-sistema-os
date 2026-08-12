-- Migration: Contratos Mensais, Notas Fiscais e Agendamentos

-- 1. Tabela de contratos mensais
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  monthly_value numeric NOT NULL,
  invoice_day integer NOT NULL CHECK (invoice_day BETWEEN 1 AND 31),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.contracts IS 'Contratos mensais de clientes';

-- 2. Tabela de notas fiscais emitidas/enviadas
CREATE TABLE IF NOT EXISTS public.contract_invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  reference_month integer NOT NULL CHECK (reference_month BETWEEN 1 AND 12),
  reference_year integer NOT NULL,
  amount numeric NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (contract_id, reference_month, reference_year)
);

COMMENT ON TABLE public.contract_invoices IS 'Notas fiscais emitidas para contratos mensais';

-- 3. Tabela de agendamentos/visitas técnicas
CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time,
  technician text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','em_andamento','concluido','cancelado')),
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.appointments IS 'Agendamentos e visitas técnicas';

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to contracts"
  ON public.contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to contract_invoices"
  ON public.contract_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated full access to appointments"
  ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para atualizar updated_at em contracts
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
