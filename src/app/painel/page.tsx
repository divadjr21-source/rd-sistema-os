"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getOrders, getPendingInvoices, markInvoiceAsSent, getAppointments } from "@/services/storage";
import { OrderService, OrderStatus } from "@/types";
import { formatCurrency, statusLabels, statusColors, priorityLabels, priorityColors, paymentStatusLabels, paymentStatusColors, toBrazilDateKey, whatsappLink } from "@/lib/utils";
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
  Calendar,
  Bell,
  Receipt,
  MessageCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isSameDay, isBefore, startOfDay, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast, toastError } from "@/hooks/use-toast";

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
    { contract: { id: string; title: string; client: { fullName: string }; monthlyValue: number }; invoice: { sentAt?: string } | null; nfIssueDay: number }[]
  >([]);
  const [appointments, setAppointments] = useState<{ id: string; title: string; scheduledAt: string; client?: { fullName: string } }[]>([]);
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

        const [ordersData, invoicesData, appointmentsData] = await Promise.all([
          getOrders(),
          getPendingInvoices(month, year).catch(() => []),
          getAppointments().catch(() => []),
        ]);

        setOrders(ordersData || []);
        setPendingInvoices(
          (invoicesData || []).map((i) => ({
            contract: i.contract,
            invoice: i.invoice,
            nfIssueDay: i.contract.nfIssueDay,
          }))
        );
        setAppointments(
          (appointmentsData || []).map((a) => ({
            id: a.id,
            title: a.title,
            scheduledAt: a.scheduledAt,
            client: a.client || a.order?.client,
          }))
        );
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
        setLoadError(true);
        setOrders([]);
        setPendingInvoices([]);
        setAppointments([]);
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
          nfIssueDay: i.contract.nfIssueDay,
        }))
      );
      toast({ title: "Nota fiscal marcada como enviada", variant: "success" });
    } catch (error) {
      toastError(error, "Não foi possível marcar a NF como enviada");
    }
  };

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const todayCount = orders.filter((o) => o.createdAt.slice(0, 10) === todayStr).length;

  const currentDay = today.getDate();

  const vencendoHoje = pendingInvoices.filter((p) => !p.invoice?.sentAt && p.nfIssueDay === currentDay);
  const vencendoProximos3 = pendingInvoices.filter((p) => {
    if (p.invoice?.sentAt) return false;
    const diasRestantes = p.nfIssueDay - currentDay;
    return diasRestantes > 0 && diasRestantes <= 7;
  });
  const vencidas = pendingInvoices.filter((p) => {
    if (p.invoice?.sentAt) return false;
    return p.nfIssueDay < currentDay;
  });

  // O.S. finalizadas mas ainda não pagas — lembrete pra cobrar o cliente.
  const cobrancasPendentes = orders
    .filter((o) => o.status === "finalizado" && o.paymentStatus === "aguardando")
    .map((o) => {
      const total = (o.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
      return { order: o, total };
    });

  const appointmentsToday = appointments.filter((a) => {
    if (!a.scheduledAt) return false;
    const [year, month, day] = toBrazilDateKey(a.scheduledAt).split("-").map(Number);
    const scheduledLocal = new Date(year, month - 1, day, 12, 0, 0);
    return isSameDay(scheduledLocal, today);
  });

  const appointmentsUpcoming = appointments.filter((a) => {
    if (!a.scheduledAt) return false;
    const [year, month, day] = toBrazilDateKey(a.scheduledAt).split("-").map(Number);
    const scheduledLocal = new Date(year, month - 1, day, 12, 0, 0);
    return isBefore(startOfDay(today), startOfDay(scheduledLocal)) || isSameDay(scheduledLocal, addDays(today, 1)) || isSameDay(scheduledLocal, addDays(today, 2)) || isSameDay(scheduledLocal, addDays(today, 3));
  }).filter((a) => !appointmentsToday.some((t) => t.id === a.id));

  const formatDateTime = (iso: string) => {
    const [year, month, day] = toBrazilDateKey(iso).split("-").map(Number);
    const d = new Date(year, month - 1, day, 12, 0, 0);
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  };

  const monthlyRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "finalizado")
      .reduce((acc, o) => {
        const total = (o.budgetItems || []).reduce((s, b) => s + b.total, 0);
        return acc + total;
      }, 0);
  }, [orders]);

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
          maskable
        />
        <Card icon={Clock} label="Em Andamento" value={orders.filter((o) => ["aprovado", "em_execucao"].includes(o.status)).length.toString()} />
        <Card icon={CheckCircle} label="Finalizados" value={orders.filter((o) => o.status === "finalizado").length.toString()} />
      </div>

      {(vencendoHoje.length > 0 || vencendoProximos3.length > 0 || vencidas.length > 0) && (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-450" />
              <h2 className="text-lg font-semibold">Alertas de Notas Fiscais</h2>
            </div>
            <span className="text-sm text-graphite-400">
              {currentMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
          </div>

          <div className="space-y-3">
            {vencendoHoje.map((p) => (
              <InvoiceAlertRow
                key={`hoje-${p.contract.id}`}
                contract={p.contract}
                invoiceDay={p.nfIssueDay}
                alertType="hoje"
                onMarkSent={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
              />
            ))}
            {vencendoProximos3.map((p) => (
              <InvoiceAlertRow
                key={`prox-${p.contract.id}`}
                contract={p.contract}
                invoiceDay={p.nfIssueDay}
                alertType="proximo"
                onMarkSent={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
              />
            ))}
            {vencidas.map((p) => (
              <InvoiceAlertRow
                key={`atr-${p.contract.id}`}
                contract={p.contract}
                invoiceDay={p.nfIssueDay}
                alertType="atrasada"
                onMarkSent={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
              />
            ))}
          </div>
        </div>
      )}

      {cobrancasPendentes.length > 0 && (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-danger" />
            <h2 className="text-lg font-semibold">Cobranças Pendentes</h2>
            <span className="text-xs bg-danger/15 text-danger px-2 py-0.5 rounded-full font-medium">
              {cobrancasPendentes.length}
            </span>
          </div>
          <p className="text-xs text-graphite-500 mb-4">
            O.S. finalizadas que ainda estão aguardando pagamento — entre em contato com o cliente.
          </p>
          <div className="space-y-2">
            {cobrancasPendentes.map(({ order, total }) => (
              <div
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-graphite-950 border border-graphite-800 rounded-xl p-3"
              >
                <Link href={`/painel/os/${order.id}`} className="min-w-0">
                  <p className="font-medium text-sm hover:underline">
                    #{order.number} — {order.client.fullName}
                  </p>
                  <p className="text-xs text-graphite-400 truncate">{order.description}</p>
                </Link>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-semibold text-danger">{formatCurrency(total)}</span>
                  <a
                    href={whatsappLink(
                      order.client.phone,
                      `Olá ${order.client.fullName}! Passando para lembrar sobre o pagamento pendente da O.S. nº ${order.number} (${formatCurrency(total)}). Qualquer dúvida, estou à disposição!`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5" /> Cobrar
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(appointmentsToday.length > 0 || appointmentsUpcoming.length > 0 || vencendoHoje.length > 0 || vencendoProximos3.length > 0 || vencidas.length > 0) && (
        <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-emerald-450" />
            <h2 className="text-lg font-semibold">Compromissos e Visitas Técnicas</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-graphite-300">Hoje</h3>
              {appointmentsToday.length === 0 && vencendoHoje.length === 0 && vencidas.length === 0 ? (
                <p className="text-sm text-graphite-500">Nenhum compromisso para hoje.</p>
              ) : (
                <>
                  {vencidas.map((p) => (
                    <div
                      key={`nf-atrasada-${p.contract.id}`}
                      className="bg-danger/10 border border-danger/30 rounded-xl p-3 flex items-start gap-2"
                    >
                      <Receipt className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Link href="/painel/contratos">
                          <p className="font-medium text-sm hover:underline">Enviar NFSe — {p.contract.title}</p>
                        </Link>
                        <p className="text-xs text-graphite-400">{p.contract.client.fullName}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-danger">Atrasada (venceu dia {p.nfIssueDay})</p>
                          <button
                            onClick={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
                            className="text-xs font-medium text-emerald-450 hover:underline flex-shrink-0"
                          >
                            Marcar como enviada
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {vencendoHoje.map((p) => (
                    <div
                      key={`nf-hoje-${p.contract.id}`}
                      className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2"
                    >
                      <Receipt className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Link href="/painel/contratos">
                          <p className="font-medium text-sm hover:underline">Enviar NFSe — {p.contract.title}</p>
                        </Link>
                        <p className="text-xs text-graphite-400">{p.contract.client.fullName}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-warning">Vence hoje</p>
                          <button
                            onClick={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
                            className="text-xs font-medium text-emerald-450 hover:underline flex-shrink-0"
                          >
                            Marcar como enviada
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {appointmentsToday.map((a) => (
                    <Link key={a.id} href={`/painel/agenda`}>
                      <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-3 hover:border-emerald-450/40 transition">
                        <p className="font-medium text-sm">{a.title}</p>
                        {a.client && <p className="text-xs text-graphite-400">{a.client.fullName}</p>}
                        <p className="text-xs text-emerald-450 mt-1">{formatDateTime(a.scheduledAt)}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-graphite-300">Próximos 3 dias</h3>
              {appointmentsUpcoming.length === 0 && vencendoProximos3.length === 0 ? (
                <p className="text-sm text-graphite-500">Nenhum compromisso nos próximos dias.</p>
              ) : (
                <>
                  {vencendoProximos3.map((p) => (
                    <div
                      key={`nf-prox-${p.contract.id}`}
                      className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-start gap-2"
                    >
                      <Receipt className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <Link href="/painel/contratos">
                          <p className="font-medium text-sm hover:underline">Enviar NFSe — {p.contract.title}</p>
                        </Link>
                        <p className="text-xs text-graphite-400">{p.contract.client.fullName}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <p className="text-xs text-warning">Vence dia {p.nfIssueDay}</p>
                          <button
                            onClick={() => handleMarkSent(p.contract.id, p.contract.monthlyValue)}
                            className="text-xs font-medium text-emerald-450 hover:underline flex-shrink-0"
                          >
                            Marcar como enviada
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {appointmentsUpcoming.slice(0, 5).map((a) => (
                    <Link key={a.id} href={`/painel/agenda`}>
                      <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-3 hover:border-emerald-450/40 transition">
                        <p className="font-medium text-sm">{a.title}</p>
                        {a.client && <p className="text-xs text-graphite-400">{a.client.fullName}</p>}
                        <p className="text-xs text-emerald-450 mt-1">{formatDateTime(a.scheduledAt)}</p>
                      </div>
                    </Link>
                  ))}
                </>
              )}
            </div>
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
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span
                              className={cn(
                                "inline-block text-[10px] px-2 py-0.5 rounded-full border",
                                statusColors[order.status]
                              )}
                            >
                              {statusLabels[order.status]}
                            </span>
                            <span
                              className={cn(
                                "inline-block text-[10px] px-2 py-0.5 rounded-full border",
                                priorityColors[order.priority]
                              )}
                            >
                              {priorityLabels[order.priority]}
                            </span>
                            <span
                              className={cn(
                                "inline-block text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap",
                                paymentStatusColors[order.paymentStatus]
                              )}
                            >
                              {paymentStatusLabels[order.paymentStatus]}
                            </span>
                          </div>
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
  maskable,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  highlight?: boolean;
  maskable?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!maskable) return;
    setHidden(localStorage.getItem("rd_hide_revenue") === "1");
  }, [maskable]);

  const toggleHidden = () => {
    const next = !hidden;
    setHidden(next);
    localStorage.setItem("rd_hide_revenue", next ? "1" : "0");
  };

  return (
    <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl", highlight ? "bg-emerald-450/20 text-emerald-450" : "bg-graphite-800 text-graphite-300")}>
          <Icon className="w-5 h-5" />
        </div>
        {maskable && (
          <button
            onClick={toggleHidden}
            className="text-graphite-500 hover:text-graphite-300 p-1"
            title={hidden ? "Mostrar valor" : "Ocultar valor"}
          >
            {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      <p className={cn("text-2xl font-bold mt-3", highlight && "text-emerald-450")}>
        {maskable && hidden ? "R$ ••••••" : value}
      </p>
      <p className="text-sm text-graphite-400">{label}</p>
    </div>
  );
}

function InvoiceAlertRow({
  contract,
  invoiceDay,
  alertType,
  onMarkSent,
}: {
  contract: { id: string; title: string; client: { fullName: string }; monthlyValue: number };
  invoiceDay: number;
  alertType: "hoje" | "proximo" | "atrasada";
  onMarkSent: () => void;
}) {
  const config = {
    hoje: { icon: Clock, color: "bg-warning/10 text-warning", label: "Vence hoje" },
    proximo: { icon: FileText, color: "bg-info/10 text-info", label: "Vence em breve" },
    atrasada: { icon: AlertCircle, color: "bg-danger/10 text-danger", label: "Atrasada" },
  };
  const { icon: Icon, color, label } = config[alertType];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-graphite-950 border border-graphite-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-medium">{contract.title}</p>
          <p className="text-sm text-graphite-400">{contract.client.fullName} - {formatCurrency(contract.monthlyValue)}</p>
          <p className="text-xs text-graphite-500">
            {label} - NF deve ser emitida no dia {invoiceDay}
          </p>
        </div>
      </div>
      <Button size="sm" className="gap-2 shrink-0" onClick={onMarkSent}>
        <Send className="w-4 h-4" /> Marcar como Enviada
      </Button>
    </div>
  );
}
