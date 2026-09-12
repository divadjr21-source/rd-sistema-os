"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTechnicalReports, getOrders, createTechnicalReport } from "@/services/storage";
import { TechnicalReport, OrderService } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileBarChart, Plus, Search, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/hooks/use-toast";

export default function RelatoriosTecnicosPage() {
  const router = useRouter();
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<OrderService[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderService | null>(null);
  const [technicianName, setTechnicianName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getTechnicalReports();
      setReports(data);
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    setSelectedOrder(null);
    setOrderSearch("");
    setTechnicianName("");
    setModalOpen(true);
    try {
      const orders = await getOrders();
      setAvailableOrders(orders);
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return availableOrders.slice(0, 20);
    return availableOrders
      .filter((o) => o.number.toLowerCase().includes(q) || o.client.fullName.toLowerCase().includes(q))
      .slice(0, 20);
  }, [availableOrders, orderSearch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || submitting) return;
    setSubmitting(true);
    try {
      const created = await createTechnicalReport(selectedOrder.id, technicianName);
      setModalOpen(false);
      router.push(`/painel/relatorios-tecnicos/${created.id}`);
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios Técnicos</h1>
          <p className="text-sm text-graphite-400 mt-1">
            Documente o atendimento com fotos e gere um relatório profissional para o cliente.
          </p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="w-4 h-4" /> Novo Relatório Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Relatório Técnico</DialogTitle>
              <DialogDescription>Escolha a O.S. que esse relatório documenta.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {!selectedOrder ? (
                <div className="space-y-2">
                  <Label>Buscar O.S. por número ou cliente</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-graphite-500" />
                    <Input
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Ex: 2026-0010 ou Pedro"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-graphite-800 rounded-xl divide-y divide-graphite-800">
                    {filteredOrders.length === 0 ? (
                      <p className="text-sm text-graphite-500 p-3">Nenhuma O.S. encontrada.</p>
                    ) : (
                      filteredOrders.map((o) => (
                        <button
                          type="button"
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="w-full text-left p-3 hover:bg-graphite-800 transition"
                        >
                          <p className="text-sm font-medium">
                            #{o.number} — {o.client.fullName}
                          </p>
                          <p className="text-xs text-graphite-500 truncate">{o.description}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        #{selectedOrder.number} — {selectedOrder.client.fullName}
                      </p>
                      <p className="text-xs text-graphite-500">{selectedOrder.description}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                      Trocar
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="technicianName">Técnico Responsável (opcional)</Label>
                    <Input
                      id="technicianName"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Nome do técnico"
                    />
                  </div>
                </>
              )}
              <DialogFooter>
                <Button type="submit" disabled={!selectedOrder || submitting} className="w-full">
                  {submitting ? "Criando..." : "Criar Rascunho"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-graphite-400 text-sm">Carregando...</p>
      ) : loadError ? (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm text-danger">{loadError}</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-graphite-500">
          <FileBarChart className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum relatório técnico ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/painel/relatorios-tecnicos/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-4 bg-graphite-900 border border-graphite-800 rounded-xl p-4 hover:border-emerald-450/40 transition"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {r.reportNumber} — #{r.order?.number} {r.order?.client.fullName}
                </p>
                <p className="text-xs text-graphite-500 truncate">{r.title || r.order?.description}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-xs text-graphite-500 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> {r.photos.length}
                </span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    r.status === "finalizado"
                      ? "bg-emerald-450/15 text-emerald-450"
                      : "bg-graphite-800 text-graphite-300"
                  )}
                >
                  {r.status === "finalizado" ? "Finalizado" : "Rascunho"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
