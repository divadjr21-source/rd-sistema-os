"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getOrdersByMonth, getActiveContracts, getCompany } from "@/services/storage";
import { OrderService, Contract } from "@/types";
import { formatCurrency, statusLabels } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ClipboardList, CheckCircle, XCircle, TrendingUp, Receipt, Download, Printer, Wallet, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast, toastError } from "@/hooks/use-toast";

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
    } catch (error) {
      toastError(error, "Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const company = await getCompany().catch(() => null);
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 14;

      doc.setFillColor(16, 24, 21);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(company?.name || "RD Solutions", marginX, 13);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Relatório Mensal", marginX, 20);
      doc.setFontSize(11);
      doc.text(format(currentDate, "MMMM yyyy", { locale: ptBR }), pageWidth - marginX, 16, {
        align: "right",
      });

      doc.setTextColor(20, 20, 20);
      let y = 38;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo do Período", marginX, y);
      y += 8;

      const summaryRows = [
        ["Total de O.S.", String(orders.length)],
        ["O.S. Finalizadas", String(finalizados.length)],
        ["O.S. em Aberto", String(emAberto.length)],
        ["O.S. Canceladas/Recusadas", String(cancelados.length)],
        ["Faturamento de O.S. Concluídas", formatCurrency(faturamentoOS)],
        ["Contratos Mensais Ativos", `${contracts.length} contrato(s) - ${formatCurrency(faturamentoContratos)}`],
        ["Faturamento Total do Mês", formatCurrency(faturamentoTotal)],
      ];

      autoTable(doc, {
        startY: y,
        margin: { left: marginX, right: marginX },
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        body: summaryRows,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Detalhamento das O.S.", marginX, y);

      autoTable(doc, {
        startY: y + 3,
        margin: { left: marginX, right: marginX },
        head: [["O.S.", "Cliente", "Status", "Data", "Valor"]],
        body: orders.map((order) => {
          const total = (order.budgetItems || []).reduce((acc, item) => acc + item.total, 0);
          return [
            order.number,
            order.client.fullName,
            statusLabels[order.status] || order.status,
            new Date(order.createdAt).toLocaleDateString("pt-BR"),
            formatCurrency(total),
          ];
        }),
        theme: "grid",
        headStyles: { fillColor: [16, 24, 21] },
        styles: { fontSize: 8.5 },
        columnStyles: { 4: { halign: "right" } },
      });

      doc.save(`relatorio-${format(currentDate, "yyyy-MM")}.pdf`);
      toast({ title: "PDF do relatório gerado com sucesso", variant: "success" });
    } catch (error) {
      toastError(error, "Não foi possível gerar o PDF do relatório");
    }
  };

  const finalizados = useMemo(() => orders.filter((o) => o.status === "finalizado"), [orders]);
  const emAberto = useMemo(
    () => orders.filter((o) => !["finalizado", "recusado"].includes(o.status)),
    [orders]
  );
  const cancelados = useMemo(() => orders.filter((o) => o.status === "recusado"), [orders]);
  const pagas = useMemo(() => orders.filter((o) => o.paymentStatus === "paga"), [orders]);

  const [showOnlyPaid, setShowOnlyPaid] = useState(false);
  const displayedOrders = showOnlyPaid ? pagas : orders;

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

          <div className="flex items-center justify-end gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
            <Button type="button" onClick={handleDownloadPDF} className="gap-2">
              <Download className="w-4 h-4" /> Baixar PDF
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <Card
              icon={Wallet}
              label="O.S. Pagas"
              value={pagas.length.toString()}
              color="text-emerald-450"
              onClick={() => setShowOnlyPaid((v) => !v)}
              active={showOnlyPaid}
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Detalhamento das O.S.</h2>
              {showOnlyPaid && (
                <button
                  onClick={() => setShowOnlyPaid(false)}
                  className="text-xs bg-emerald-450/15 text-emerald-450 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 print:hidden"
                >
                  Mostrando só O.S. Pagas <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {displayedOrders.length === 0 ? (
              <p className="text-graphite-500 text-center py-8">
                {showOnlyPaid ? "Nenhuma O.S. paga neste período." : "Nenhuma O.S. encontrada no período."}
              </p>
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
                    {displayedOrders.map((order) => {
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
  onClick,
  active,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-graphite-900 border rounded-2xl p-5 shadow-card flex items-center gap-4 w-full text-left transition ${
        active ? "border-emerald-450" : "border-graphite-800"
      } ${onClick ? "hover:border-emerald-450/60 cursor-pointer" : ""}`}
    >
      <div className={`p-3 rounded-xl bg-graphite-950 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm text-graphite-400">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Wrapper>
  );
}
