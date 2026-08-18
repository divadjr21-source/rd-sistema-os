"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getOrderById, getCompany, updateOrderBudgetStatus } from "@/services/storage";
import { OrderService, BudgetStatus } from "@/types";
import {
  formatCurrency,
  formatPhone,
  budgetStatusLabels,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, FileText, Package, Wrench, Calendar, Phone, MapPin, User, Shield, Printer, Building2, Mail, Clock } from "lucide-react";

export default function OrcamentoPublicoPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderService | null>(null);
  const [company, setCompany] = useState<{ name: string; address?: string; city?: string; whatsapp?: string; email?: string; cnpj?: string; logo?: string }>({ name: "RD Solutions" });
  const [action, setAction] = useState<BudgetStatus | null>(null);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    refresh();
  }, [id]);

  const refresh = async () => {
    const [o, c] = await Promise.all([getOrderById(id), getCompany()]);
    if (o) setOrder(o);
    setCompany(c);
  };

  const materialItems = useMemo(() => (order?.budgetItems || []).filter((i) => i.type === "material"), [order]);
  const serviceItems = useMemo(() => (order?.budgetItems || []).filter((i) => i.type === "service"), [order]);
  const materialSubtotal = useMemo(() => materialItems.reduce((acc, item) => acc + item.total, 0), [materialItems]);
  const serviceSubtotal = useMemo(() => serviceItems.reduce((acc, item) => acc + item.total, 0), [serviceItems]);
  const total = useMemo(() => materialSubtotal + serviceSubtotal, [materialSubtotal, serviceSubtotal]);

  const handleApprove = async () => {
    await updateOrderBudgetStatus(id, "aprovado");
    const updated = await getOrderById(id);
    setOrder(updated || null);
    setAction("aprovado");
    setDone(true);
  };

  const handleReject = async () => {
    await updateOrderBudgetStatus(id, "recusado", reason.trim() || undefined);
    const updated = await getOrderById(id);
    setOrder(updated || null);
    setAction("recusado");
    setDone(true);
  };

  const todayStr = new Date().toLocaleDateString("pt-BR");
  const validityStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR");

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-graphite-400">
        Orçamento não encontrado.
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto bg-graphite-900 border border-graphite-800 rounded-2xl p-8 text-center shadow-card">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-emerald-450/20">
            <CheckCircle className="w-8 h-8 text-emerald-450" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Orçamento {action === "aprovado" ? "Aprovado" : "Recusado"}!</h2>
          <p className="text-graphite-400">
            {action === "aprovado"
              ? "Obrigado! Sua O.S. foi aprovada e entrará em execução em breve."
              : "Agradecemos o retorno. Nossa equipe entrará em contato para ajustes."}
          </p>
          {order.budgetRejectionReason && (
            <p className="mt-4 text-sm text-graphite-400 bg-graphite-950 p-3 rounded-xl">
              <strong>Motivo:</strong> {order.budgetRejectionReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4 print:bg-white print:text-black">
      <div className="max-w-5xl mx-auto space-y-6 print:space-y-4">
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-emerald-450 flex items-center justify-center print:bg-emerald-700">
                <Shield className="w-9 h-9 text-graphite-950 print:text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold print:text-3xl">{company.name || "RD Solutions"}</h1>
                <p className="text-xs text-graphite-400 print:text-gray-600">
                  Segurança Eletrônica e Tecnologia
                </p>
              </div>
            </div>
            <div className="text-left lg:text-right">
              <p className="text-xs text-graphite-400 print:text-gray-600 uppercase tracking-wide">Proposta Comercial</p>
              <p className="text-lg font-bold">O.S. #{order.number}</p>
              <p className="text-xs text-graphite-400 print:text-gray-600">Emissão: {todayStr}</p>
              <p className="text-xs text-graphite-400 print:text-gray-600">Validade: {validityStr}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-graphite-800 print:border-gray-300 pt-5">
            <Info icon={Building2} label="Endereço" value={`${company.address || ""}${company.city ? `, ${company.city}` : ""}`} />
            <Info icon={Phone} label="Telefone" value={company.whatsapp ? formatPhone(company.whatsapp) : "-"} />
            {company.cnpj && <Info icon={FileText} label="CNPJ" value={company.cnpj} />}
            {company.email && <Info icon={Mail} label="E-mail" value={company.email} />}
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <User className="w-5 h-5 text-emerald-450" /> Dados do Cliente
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info icon={User} label="Cliente" value={order.client.fullName} />
            <Info icon={Phone} label="Telefone" value={formatPhone(order.client.phone)} />
            <Info icon={MapPin} label="Endereço" value={order.client.address} />
            <Info icon={Calendar} label="Abertura da O.S." value={new Date(order.createdAt).toLocaleDateString("pt-BR")} />
            <Info icon={FileText} label="Status do Orçamento" value={budgetStatusLabels[order.budgetStatus || "pendente"]} />
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <Package className="w-5 h-5 text-info" /> Tabela 1 - Equipamentos e Materiais
          </h2>
          {materialItems.length === 0 ? (
            <p className="text-graphite-500 py-4 text-center print:text-gray-600">Nenhum material orçado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-graphite-950 print:bg-gray-100">
                  <tr className="text-left text-graphite-400 print:text-gray-700">
                    <th className="p-3 font-medium">Item</th>
                    <th className="p-3 font-medium text-center">Qtd.</th>
                    <th className="p-3 font-medium text-right">Valor Unit.</th>
                    <th className="p-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800 print:divide-gray-300">
                  {materialItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-right text-sm text-graphite-400 print:text-gray-700">
            Subtotal Materiais:{" "}
            <span className="font-semibold text-white print:text-black">{formatCurrency(materialSubtotal)}</span>
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <Wrench className="w-5 h-5 text-warning" /> Tabela 2 - Serviços e Mão de Obra
          </h2>
          {serviceItems.length === 0 ? (
            <p className="text-graphite-500 py-4 text-center print:text-gray-600">Nenhum serviço orçado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-graphite-950 print:bg-gray-100">
                  <tr className="text-left text-graphite-400 print:text-gray-700">
                    <th className="p-3 font-medium">Descrição</th>
                    <th className="p-3 font-medium text-center">Qtd.</th>
                    <th className="p-3 font-medium text-right">Valor Unit.</th>
                    <th className="p-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800 print:divide-gray-300">
                  {serviceItems.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-right text-sm text-graphite-400 print:text-gray-700">
            Subtotal Serviços:{" "}
            <span className="font-semibold text-white print:text-black">{formatCurrency(serviceSubtotal)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-450/30 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <Clock className="w-5 h-5 text-emerald-450" /> Resumo Financeiro
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-graphite-950 print:bg-gray-100 rounded-xl p-4 text-center">
              <p className="text-sm text-graphite-400 print:text-gray-600">Subtotal Materiais</p>
              <p className="text-xl font-bold text-info print:text-black">{formatCurrency(materialSubtotal)}</p>
            </div>
            <div className="bg-graphite-950 print:bg-gray-100 rounded-xl p-4 text-center">
              <p className="text-sm text-graphite-400 print:text-gray-600">Subtotal Serviços</p>
              <p className="text-xl font-bold text-warning print:text-black">{formatCurrency(serviceSubtotal)}</p>
            </div>
            <div className="bg-emerald-450/10 print:bg-gray-100 rounded-xl p-4 text-center border border-emerald-450/30">
              <p className="text-sm text-emerald-450 print:text-gray-600">Total Geral</p>
              <p className="text-3xl font-bold text-emerald-450 print:text-emerald-700">{formatCurrency(total)}</p>
            </div>
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <FileText className="w-5 h-5 text-emerald-450" /> Condições e Observações
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-3 text-sm text-graphite-400 print:text-gray-700">
              <p className="whitespace-pre-line bg-graphite-950 print:bg-transparent p-3 rounded-xl">
                {order.description || "Forma de pagamento a combinar."}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-graphite-800 print:border-gray-300 pb-2">
                <span className="text-graphite-400 print:text-gray-700">Prazo de entrega</span>
                <span className="font-medium">A combinar</span>
              </div>
              <div className="flex justify-between border-b border-graphite-800 print:border-gray-300 pb-2">
                <span className="text-graphite-400 print:text-gray-700">Forma de pagamento</span>
                <span className="font-medium">Pix / Boleto</span>
              </div>
              <div className="flex justify-between border-b border-graphite-800 print:border-gray-300 pb-2">
                <span className="text-graphite-400 print:text-gray-700">Garantia</span>
                <span className="font-medium">90 dias</span>
              </div>
              <div className="flex justify-between">
                <span className="text-graphite-400 print:text-gray-700">Validade da proposta</span>
                <span className="font-medium">{validityStr}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:shadow-none print:border-black print:bg-white print:break-inside-avoid">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 print:text-xl">
            <FileText className="w-5 h-5 text-emerald-450" /> Aceite e Assinaturas
          </h2>
          <p className="text-sm text-graphite-400 print:text-gray-700 mb-6">
            Ao assinar este documento, o cliente declara estar de acordo com os valores, condições e especificações técnicas descritas nesta proposta.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="border-t border-graphite-700 print:border-black pt-4">
                <p className="font-semibold">{company.name || "RD Solutions"}</p>
                <p className="text-xs text-graphite-500 print:text-gray-600">Responsável Técnico</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-graphite-700 print:border-black pt-4">
                <p className="font-semibold">{order.client.fullName}</p>
                <p className="text-xs text-graphite-500 print:text-gray-600">Cliente / Aceite</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
          </Button>
          <Button
            className="flex-1 gap-2 bg-emerald-450 text-graphite-950 hover:bg-emerald-550 h-12"
            onClick={handleApprove}
          >
            <CheckCircle className="w-5 h-5" /> Aprovar Orçamento
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2 h-12"
            onClick={() => setAction("recusado")}
          >
            <XCircle className="w-5 h-5" /> Solicitar Ajuste / Recusar
          </Button>
        </div>

        {action === "recusado" && (
          <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card print:hidden">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reason">Motivo do ajuste / recusa</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o que precisa ser ajustado..."
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAction(null)}
                >
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleReject}
                >
                  <XCircle className="w-4 h-4" /> Confirmar Recusa
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-emerald-450 mt-0.5 print:text-emerald-700" />
      <div>
        <p className="text-xs text-graphite-400 print:text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
