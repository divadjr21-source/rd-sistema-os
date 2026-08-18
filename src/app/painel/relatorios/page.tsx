"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getOrdersByMonth, getActiveContracts } from "@/services/storage";
import { OrderService, Contract } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ClipboardList, CheckCircle, XCircle, TrendingUp, Receipt, Download } from "lucide-react";

export default function RelatoriosPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [orders, setOrders] = useState<OrderService[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    refresh();
  }, [currentDate]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [o, c] = await Promise.all([getOrdersByMonth(year, month), getActiveContracts()]);
      setOrders(o);
      setContracts(c);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const finalizados = useMemo(() => orders.filter((o) => o.status === "finalizado"), [orders]);
  const emAberto = useMemo(
    () => orders.filter((o) => !["finalizado", "recusado"].includes(o.status)),
    [orders]
  );
  const cancelados = useMemo(() => orders.filter((o) => o.status === "recusado"), [orders]);

  const faturamentoOS = useMemo(
    () =>
      finalizados.reduce((acc, order) => {
        const totalItems = (order.budgetItems || []).reduce((sum, item) => sum + item.total, 0);
        return acc + totalItems;
      }, 0),
    [finalizados]
  );

  const faturamentoContratos = useMemo(
    () => contracts.reduce((acc, c) => acc + c.monthlyValue, 0),
    [contracts]
  );

  const faturamentoTotal = useMemo(
    () => faturamentoOS + faturamentoContratos,
    [faturamentoOS, faturamentoContratos]
  );

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-sm text-graphite-400">Resumo mensal de O.S. e faturamento</p>
        </div>
        <div className="flex items-center gap-2 bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[110px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-450 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div id="relatorio-print" className="space-y-6">
          <div className="print-header hidden print:block mb-6">
            <h2 className="text-2xl font-bold">RD Solutions - Relatório Mensal</h2>
            <p className="text-sm text-gray-600 capitalize">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</p>
          </div>

          <div className="flex items-center justify-end print:hidden">
            <Button type="button" onClick={handlePrint} className="gap-2">
              <Download className="w-4 h-4" /> Exportar / Baixar PDF
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              icon={ClipboardList}
              label="Total de O.S."
              value={orders.length.toString()}
              color="text-info"
            />
            <Card
              icon={CheckCircle}
              label="O.S. Finalizadas"
              value={finalizados.length.toString()}
              color="text-emerald-450"
            />
            <Card
              icon={ClipboardList}
              label="O.S. em Aberto"
              value={emAberto.length.toString()}
              color="text-warning"
            />
            <Card
              icon={XCircle}
              label="O.S. Canceladas/Recusadas"
              value={cancelados.length.toString()}
              color="text-danger"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-emerald-450/15">
                  <TrendingUp className="w-5 h-5 text-emerald-450" />
                </div>
                <p className="text-sm text-graphite-400">Faturamento de O.S. Concluídas</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(faturamentoOS)}</p>
            </div>

            <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-info/15">
                  <Receipt className="w-5 h-5 text-info" />
                </div>
                <p className="text-sm text-graphite-400">Contratos Mensais Ativos</p>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(faturamentoContratos)}</p>
              <p className="text-xs text-graphite-500 mt-1">{contracts.length} contratos ativos</p>
            </div>

            <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card lg:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-lg bg-warning/15">
                  <TrendingUp className="w-5 h-5 text-warning" />
                </div>
                <p className="text-sm text-graphite-400">Faturamento Total do Mês</p>
              </div>
              <p className="text-3xl font-bold text-emerald-450">{formatCurrency(faturamentoTotal)}</p>
            </div>
          </div>

          <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-6 shadow-card">
            <h2 className="text-lg font-semibold mb-4">Detalhamento das O.S.</h2>
            {orders.length === 0 ? (
              <p className="text-graphite-500 text-center py-8">Nenhuma O.S. encontrada no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-graphite-800 text-graphite-400">
                    <tr>
                      <th className="py-3 px-3 text-left font-medium">O.S.</th>
                      <th className="py-3 px-3 text-left font-medium">Cliente</th>
                      <th className="py-3 px-3 text-left font-medium">Status</th>
                      <th className="py-3 px-3 text-left font-medium">Data</th>
                      <th className="py-3 px-3 text-right font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-graphite-800">
                    {orders.map((order) => {
                      const total = (order.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
                      return (
                        <tr key={order.id}>
                          <td className="py-3 px-3 font-semibold text-emerald-450">#{order.number}</td>
                          <td className="py-3 px-3">{order.client.fullName}</td>
                          <td className="py-3 px-3 capitalize">{order.status.replace(/_/g, " ")}</td>
                          <td className="py-3 px-3 text-graphite-400">
                            {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="py-3 px-3 text-right">{formatCurrency(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-graphite-900 border border-graphite-800 rounded-2xl p-5 shadow-card flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-graphite-950 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-graphite-400">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}
