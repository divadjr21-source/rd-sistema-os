"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getOrderById, getCompany } from "@/services/storage";
import { OrderService, CompanySettings } from "@/types";
import { formatCurrency, formatPhone, valorPorExtenso } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  ShieldCheck,
  User,
  MapPin,
  Calendar,
  Hash,
  AlertTriangle,
} from "lucide-react";

export default function ReciboPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderService | null>(null);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOrderById(id), getCompany()]).then(([o, c]) => {
      setOrder(o || null);
      setCompany(c);
      setLoading(false);
    });
  }, [id]);

  const total = useMemo(() => (order?.budgetItems || []).reduce((acc, i) => acc + i.total, 0), [order]);
  const receiptNumber = order ? `REC-${order.number}` : "";
  const todayStr = new Date().toLocaleDateString("pt-BR");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-graphite-400">Ordem de Serviço não encontrada.</div>;
  }

  // Um Recibo de Pagamento só deve ser emitido depois que o pagamento foi
  // efetivamente confirmado — evita gerar um documento de quitação para
  // uma O.S. que ainda não foi paga.
  if (order.paymentStatus !== "paga") {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-warning mx-auto" />
        <h1 className="text-xl font-bold">Pagamento ainda não confirmado</h1>
        <p className="text-graphite-400">
          Esta O.S. está marcada como <strong>&quot;Aguardando Pagamento&quot;</strong>. Marque o pagamento como{" "}
          <strong>&quot;Paga&quot;</strong> na tela da O.S. antes de emitir o recibo de quitação.
        </p>
        <Link href={`/painel/os/${id}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Voltar para a O.S.
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4 print:bg-white print:text-black print:p-0">
      <div className="max-w-3xl mx-auto space-y-6 print:space-y-4">
        <div className="flex gap-3 print:hidden">
          <Link href={`/painel/os/${id}`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir / Baixar PDF
          </Button>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-8 shadow-card print:shadow-none print:border-black print:bg-white print:p-10 relative overflow-hidden">
          {/* Carimbo PAGO / QUITADO */}
          <div className="absolute top-8 right-8 print:top-10 print:right-10 pointer-events-none">
            <div className="border-4 border-emerald-450 text-emerald-450 print:border-emerald-700 print:text-emerald-700 rounded-lg px-4 py-2 rotate-[-8deg] opacity-90">
              <p className="text-xl font-black tracking-widest text-center leading-tight">PAGO</p>
              <p className="text-xs font-bold tracking-widest text-center">QUITADO</p>
            </div>
          </div>

          {/* Cabeçalho */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-xl bg-emerald-450 flex items-center justify-center print:bg-emerald-700 flex-shrink-0">
              <ShieldCheck className="w-9 h-9 text-graphite-950 print:text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold print:text-3xl">{company?.name || "RD Solutions"}</h1>
              <p className="text-xs text-graphite-400 print:text-gray-600">CNPJ: {company?.cnpj}</p>
              <p className="text-xs text-graphite-400 print:text-gray-600">
                {company?.address}
                {company?.city ? `, ${company.city}` : ""}
                {company?.whatsapp ? ` — ${formatPhone(company.whatsapp)}` : ""}
              </p>
            </div>
          </div>

          <div className="text-center border-y border-graphite-800 print:border-gray-300 py-3 mb-6">
            <h2 className="text-lg font-bold uppercase tracking-wide">Recibo de Pagamento</h2>
          </div>

          {/* Dados */}
          <div className="grid sm:grid-cols-2 gap-4 text-sm mb-6">
            <Info icon={Hash} label="Recibo Nº" value={receiptNumber} />
            <Info icon={Hash} label="O.S. Nº" value={order.number} />
            <Info icon={User} label="Cliente" value={order.client.fullName} />
            <Info icon={Calendar} label="Data" value={todayStr} />
            <Info icon={MapPin} label="Endereço" value={order.client.address} className="sm:col-span-2" />
          </div>

          {/* Valor em destaque */}
          <div className="bg-emerald-450/10 border border-emerald-450/30 rounded-xl p-5 text-center mb-6 print:bg-gray-100 print:border-gray-300">
            <p className="text-xs text-graphite-400 print:text-gray-600 uppercase tracking-wide">Valor Recebido</p>
            <p className="text-3xl font-bold text-emerald-450 print:text-emerald-700">{formatCurrency(total)}</p>
            <p className="text-sm text-graphite-400 print:text-gray-700 mt-1 italic">
              ({valorPorExtenso(total)})
            </p>
          </div>

          {/* Itens */}
          {order.budgetItems && order.budgetItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-graphite-300 print:text-black">
                Discriminação dos Itens / Serviços
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-graphite-500 print:text-gray-600 border-b border-graphite-800 print:border-gray-300">
                    <th className="py-1.5 pr-2 font-medium">Item</th>
                    <th className="py-1.5 pr-2 font-medium text-center">Qtd.</th>
                    <th className="py-1.5 pr-2 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800 print:divide-gray-300">
                  {order.budgetItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-2">{item.name}</td>
                      <td className="py-1.5 pr-2 text-center">{item.quantity}</td>
                      <td className="py-1.5 pr-2 text-right">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Declaração de quitação */}
          <div className="flex items-start gap-2 bg-graphite-950 print:bg-transparent border border-graphite-800 print:border-gray-300 rounded-xl p-4 mb-8 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-450 print:text-emerald-700 flex-shrink-0 mt-0.5" />
            <p className="text-graphite-300 print:text-gray-800">
              Declaro, para os devidos fins, ter recebido de <strong>{order.client.fullName}</strong> a quantia de{" "}
              <strong>{formatCurrency(total)}</strong> ({valorPorExtenso(total)}), referente aos serviços e/ou
              materiais descritos na Ordem de Serviço nº <strong>{order.number}</strong>, dando plena e total
              quitação, para nada mais ser reclamado a este título.
            </p>
          </div>

          {/* Assinaturas */}
          <div className="grid sm:grid-cols-2 gap-8 print:break-inside-avoid">
            <div className="text-center">
              <div className="border-t border-graphite-700 print:border-black pt-3">
                <p className="font-semibold">{company?.name || "RD Solutions"}</p>
                <p className="text-xs text-graphite-500 print:text-gray-600">CNPJ: {company?.cnpj}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-graphite-700 print:border-black pt-3">
                <p className="font-semibold">{order.client.fullName}</p>
                <p className="text-xs text-graphite-500 print:text-gray-600">Cliente Contratante</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-2 ${className || ""}`}>
      <Icon className="w-4 h-4 text-emerald-450 print:text-emerald-700 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-xs text-graphite-400 print:text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
