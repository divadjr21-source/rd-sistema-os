"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCostProjects,
  getOrdersWithoutCostProject,
  createCostProject,
} from "@/services/storage";
import { CostProject, OrderService } from "@/types";
import { formatCurrency } from "@/lib/utils";
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
import { Wallet, Plus, Search, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/hooks/use-toast";

function projectSummary(p: CostProject) {
  const totalSuppliers = p.purchases.reduce((acc, i) => acc + i.cost, 0);
  const totalDays = p.technicianDays.reduce((acc, i) => acc + i.dailyRate, 0);
  const totalCost = totalSuppliers + totalDays;
  const net = p.projectValue - totalCost;
  return { totalSuppliers, totalDays, totalCost, net };
}

export default function CustosProjetosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<CostProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<OrderService[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderService | null>(null);
  const [projectValue, setProjectValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await getCostProjects();
      setProjects(data);
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    setSelectedOrder(null);
    setProjectValue("");
    setOrderSearch("");
    setModalOpen(true);
    try {
      const orders = await getOrdersWithoutCostProject();
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
      const created = await createCostProject(selectedOrder.id, Number(projectValue) || 0);
      setModalOpen(false);
      router.push(`/painel/custos/${created.id}`);
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
          <h1 className="text-2xl font-bold">Custos / Projetos</h1>
          <p className="text-sm text-graphite-400 mt-1">Controle de lucratividade por O.S.: fornecedores, diárias e valor líquido.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={openCreateModal}>
              <Plus className="w-4 h-4" /> Novo Projeto de Custos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Projeto de Custos</DialogTitle>
              <DialogDescription>Escolha a O.S./Orçamento que você quer acompanhar financeiramente.</DialogDescription>
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
                      <p className="text-sm text-graphite-500 p-3">
                        Nenhuma O.S. disponível (todas já têm um projeto de custos, ou nenhuma corresponde à busca).
                      </p>
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
                    <Label htmlFor="projectValue">Valor do Projeto (R$)</Label>
                    <Input
                      id="projectValue"
                      type="text"
                      inputMode="decimal"
                      value={projectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || /^\d*[.,]?\d*$/.test(v)) setProjectValue(v.replace(",", "."));
                      }}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                </>
              )}
              <DialogFooter>
                <Button type="submit" disabled={!selectedOrder || submitting} className="w-full">
                  {submitting ? "Criando..." : "Criar Projeto de Custos"}
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
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-graphite-500">
          <Wallet className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum projeto de custos ainda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const { totalCost, net } = projectSummary(p);
            return (
              <Link
                key={p.id}
                href={`/painel/custos/${p.id}`}
                className="flex flex-wrap items-center justify-between gap-4 bg-graphite-900 border border-graphite-800 rounded-xl p-4 hover:border-emerald-450/40 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    #{p.order?.number} — {p.order?.client.fullName}
                  </p>
                  <p className="text-xs text-graphite-500 truncate">{p.order?.description}</p>
                </div>
                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-graphite-500">Custo Total</p>
                    <p className="text-sm font-medium">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-graphite-500">Valor Líquido</p>
                    <p
                      className={cn(
                        "text-sm font-semibold flex items-center gap-1 justify-end",
                        net >= 0 ? "text-emerald-450" : "text-danger"
                      )}
                    >
                      {net >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {formatCurrency(net)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
