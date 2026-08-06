"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getOrders } from "@/services/storage";
import { OrderService, OrderStatus } from "@/types";
import { formatCurrency, statusLabels, statusColors } from "@/lib/utils";
import {
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
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
