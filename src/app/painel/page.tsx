"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getOrders, getPendingInvoices, markInvoiceAsSent } from "@/services/storage";
import { OrderService, OrderStatus } from "@/types";
import { formatCurrency, statusLabels, statusColors } from "@/lib/utils";
import {
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
  FileText,
  Send,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const columns: { status: OrderStatus; label: string }[] = [
  { status: "pendente", label: "Pendente" },
  { status: "em_orcamento", label: "Em Orçamento" },
  { status: "aprovado", label: "Aprovado" },
  { status: "em_execucao", label: "Em Execução" },
  { status: "finalizado", label: "Finalizado" },
];

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<
    { contract: { id: string; title: string; client: { fullName: string }; monthlyValue: number }; invoice: { sentAt?: string } | null; invoiceDay: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [currentMonth] = useState(new Date());

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const month = currentMonth.getMonth() + 1;
        const year = currentMonth.getFullYear();

        const [ordersData, invoicesData] = await Promise.all([
          getOrders(),
          getPendingInvoices(month, year).catch(() => []),
        ]);

        setOrders(ordersData || []);
        setPendingInvoices(
          (invoicesData || []).map((i) => ({
            contract: i.contract,
            invoice: i.invoice,
            invoiceDay: i.contract.invoiceDay,
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        setLoadError(true);
        setOrders([]);
        setPendingInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentMonth]);

  const handleMarkSent = async (contractId: string, amount: number) => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    try {
      await markInvoiceAsSent(contractId, month, year, amount);
      const updated = await getPendingInvoices(month, year).catch(() => []);
      setPendingInvoices(
        (updated || []).map((i) => ({
          contract: i.contract,
          invoice: i.invoice,
          invoiceDay: i.contract.invoiceDay,
        }))
      );
    } catch (error) {
      console.error("Erro ao marcar NF como enviada:", error);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = orders.filter((o) => o.createdAt.slice(0, 10) === today).length;

  const monthlyRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "finalizado")
      .reduce((acc, o) => {
        const total = (o.budgetItems || []).reduce((s, b) => s + b.total, 0);
        return acc + total;
      }, 0);
  }, [orders]);

  const currentDay = new Date().getDate();
  const overdueInvoices = pendingInvoices.filter((p) => !p.invoice?.sentAt && p.invoiceDay <= currentDay);
  const upcomingInvoices = pendingInvoices.filter((p) => !p.invoice?.sentAt && p.invoiceDay > currentDay);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-graphite-900 border border-danger/30 rounded-2xl p-6 text-center">
          <AlertCircle className="w-10 h-10 text-danger mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-2">Erro ao carregar dashboard</h2>
          <p className="text-sm text-graphite-400 mb-4">Não foi possível carregar os dados. Verifique sua conexão ou tente novamente.</p>
          <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-graphite-400">Visão geral dos atendimentos</p>
        </div>
        <Link href="/chamado" target="_blank">
          <Button className="gap-2">
            <Plus className="w-4 h-4" /> Novo Chamado
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={ClipboardList} label="Chamados Hoje" value={todayCount.toString()} />
        <Card
          icon={DollarSign}
          label="Faturamento Estimado"
          value={formatCurrency(monthlyRevenue)}
          highlight
        />
        <Card icon={Clock} label="Em Andamento" value={orders.filter((o) => ["aprovado", "em_execucao"].includes(o.status)).length.toString()} />
        <Card icon={CheckCircle} label="Finalizados" value={orders.filter((o) => o.status === "finalizado").length.toString()} />
      </div>

      {(overdueInvoices.length > 0 || upcomingInvoices.length > 0) && (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-450" />
              <h2 className="text-lg font-semibold">Notas Fiscais do Mês</h2>
            </div>
            <span className="text-sm text-graphite-400">
              {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>

          <div className="space-y-3">
            {overdueInvoices.map((p) => (
              <InvoiceAlertRow
                key={p.contract.id}
                contract={p.contract}
                invoiceDay={p.invoiceDay}
                overdue
                onMarkSent={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
              />
            ))}
            {upcomingInvoices.map((p) => (
              <InvoiceAlertRow
                key={p.contract.id}
                contract={p.contract}
                invoiceDay={p.invoiceDay}
                onMarkSent={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
        <h2 className="text-lg font-semibold mb-4">Ordens de Serviço</h2>

        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="flex gap-4 min-w-[900px]">
            {columns.map((col) => {
              const items = orders.filter((o) => o.status === col.status);
              return (
                <div key={col.status} className="flex-1 min-w-[180px]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-graphite-300">{col.label}</span>
                    <span className="text-xs bg-graphite-800 px-2 py-0.5 rounded-full">{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((order) => (
                      <Link key={order.id} href={`/painel/os/${order.id}`}>
                        <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-3 hover:border-emerald-450/40 transition group">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-emerald-450">#{order.number}</span>
                            <ArrowRight className="w-4 h-4 text-graphite-500 group-hover:text-emerald-450 transition" />
                          </div>
                          <p className="font-medium text-sm truncate">{order.client.fullName}</p>
                          <p className="text-xs text-graphite-400 truncate">{order.client.phone}</p>
                          <p className="text-xs text-graphite-500 mt-1 line-clamp-2">{order.description}</p>
                          <span
                            className={cn(
                              "inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border",
                              statusColors[order.status]
                            )}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </div>
                      </Link>
                    ))}
                    {items.length === 0 && (
                      <div className="text-center py-6 text-graphite-500 text-sm">Nenhuma O.S.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", highlight ? "bg-emerald-450/20 text-emerald-450" : "bg-graphite-800 text-graphite-300")}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className={cn("text-2xl font-bold mt-3", highlight && "text-emerald-450")}>{value}</p>
      <p className="text-sm text-graphite-400">{label}</p>
    </div>
  );
}

function InvoiceAlertRow({
  contract,
  invoiceDay,
  overdue,
  onMarkSent,
}: {
  contract: { id: string; title: string; client: { fullName: string }; monthlyValue: number };
  invoiceDay: number;
  overdue?: boolean;
  onMarkSent: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-graphite-950 border border-graphite-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", overdue ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning")}>
          {overdue ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-medium">{contract.title}</p>
          <p className="text-sm text-graphite-400">{contract.client.fullName} - {formatCurrency(contract.monthlyValue)}</p>
          <p className="text-xs text-graphite-500">
            NF deve ser emitida no dia {invoiceDay}
          </p>
        </div>
      </div>
      <Button size="sm" className="gap-2 shrink-0" onClick={onMarkSent}>
        <Send className="w-4 h-4" /> Marcar como Enviada
      </Button>
    </div>
  );
}
