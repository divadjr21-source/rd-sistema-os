"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCompany, updateCompany } from "@/services/storage";
import { CompanySettings } from "@/types";
import { Building2, Save, CheckCircle } from "lucide-react";

export default function EmpresaPage() {
  const [form, setForm] = useState<CompanySettings>({
    name: "",
    whatsapp: "",
    address: "",
    city: "",
    cnpj: "",
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCompany().then((data) => {
      setForm(data);
      setLoading(false);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-emerald-450/15 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-emerald-450" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Empresa</h1>
          <p className="text-graphite-400">Configure os dados da empresa e WhatsApp de recebimento</p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome da Empresa</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="RD Solutions"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="whatsapp">WhatsApp para Recebimento de Chamados</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            type="text"
            inputMode="tel"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="5571999999999"
            required
          />
          <p className="text-xs text-graphite-500">Informe com DDI e DDD, exemplo: 5571999999999</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Endereço</Label>
          <Input
            id="address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Rua, número, bairro"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">Cidade</Label>
          <Input
            id="city"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Salvador - BA"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            name="cnpj"
            value={form.cnpj}
            onChange={handleChange}
            placeholder="00.000.000/0001-00"
            required
          />
          <p className="text-xs text-graphite-500">Usado no Recibo de Pagamento e na proposta de orçamento.</p>
        </div>

        <Button type="submit" className="w-full gap-2">
          {saved ? (
            <>
              <CheckCircle className="w-4 h-4" /> Salvo
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Salvar Configurações
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
