"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getOrderById, getCompany, updateOrderBudgetStatus } from "@/services/storage";
import { OrderService, BudgetStatus } from "@/types";
import {
  formatCurrency,
  formatPhone,
  budgetStatusLabels,
  budgetStatusColors,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, FileText, Package, Wrench, Calendar, Phone, MapPin, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OrcamentoPublicoPage() {
  const params = useParams();
  const id = params.id as string;
  const [order, setOrder] = useState<OrderService | null>(null);
  const [company, setCompany] = useState<{ name: string }>({ name: "RD Solutions" });
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

  const total = useMemo(() => {
    return (order?.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
  }, [order]);

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
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-450 flex items-center justify-center">
                <Shield className="w-7 h-7 text-graphite-950" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{company.name || "RD Solutions"}</h1>
                <p className="text-sm text-graphite-400">Orçamento de Serviço</p>
              </div>
            </div>
            <span
              className={cn(
                "text-xs px-3 py-1 rounded-full border self-start sm:self-auto",
                budgetStatusColors[order.budgetStatus || "pendente"]
              )}
            >
              {budgetStatusLabels[order.budgetStatus || "pendente"]}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Info icon={FileText} label="O.S." value={`#${order.number}`} />
            <Info icon={User} label="Cliente" value={order.client.fullName} />
            <Info icon={Phone} label="Telefone" value={formatPhone(order.client.phone)} />
            <Info icon={MapPin} label="Endereço" value={order.client.address} />
            <Info
              icon={Calendar}
              label="Abertura"
              value={new Date(order.createdAt).toLocaleDateString("pt-BR")}
            />
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
          <h2 className="text-lg font-semibold mb-4">Itens do Orçamento</h2>
          <div className="divide-y divide-graphite-800">
            {(order.budgetItems || []).length === 0 && (
              <p className="text-graphite-500 py-4 text-center">Nenhum item no orçamento.</p>
            )}
            {(order.budgetItems || []).map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {item.type === "material" ? (
                    <Package className="w-5 h-5 text-info" />
                  ) : (
                    <Wrench className="w-5 h-5 text-warning" />
                  )}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-graphite-400">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                </div>
                <span className="font-semibold">{formatCurrency(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-graphite-800 flex items-center justify-between">
            <span className="text-graphite-400">Valor Total</span>
            <span className="text-2xl font-bold text-emerald-450">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
          <h2 className="text-lg font-semibold mb-4">Aprovação do Cliente</h2>
          <p className="text-sm text-graphite-400 mb-6">
            Revise os itens acima e confirme sua decisão. Você pode aprovar o orçamento ou solicitar ajustes.
          </p>

          {action === "recusado" ? (
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
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
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
          )}
        </div>
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
      <Icon className="w-4 h-4 text-emerald-450 mt-0.5" />
      <div>
        <p className="text-xs text-graphite-400">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
