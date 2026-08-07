"use client";

import { useState, FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrder } from "@/services/storage";
import { OrderService } from "@/types";
import { formatPhone, statusLabels, statusColors } from "@/lib/utils";
import { Search, ClipboardList, Calendar, FileText, User, AlertCircle, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrackOrderModal({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderService | null>(null);
  const [history, setHistory] = useState<{ id: string; status: string; note: string | null; createdAt: string }[]>([]);
  const [error, setError] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(false);
    setOrder(null);
    setHistory([]);
    try {
      const result = await trackOrder(query);
      if (!result.order) {
        setError(true);
      } else {
        setOrder(result.order);
        setHistory(result.history);
      }
    } finally {
      setLoading(false);
    }
  };

  const displayStatus = (status: string) => statusLabels[status as keyof typeof statusLabels] || status;

  const displayStatusColor = (status: string) => statusColors[status as keyof typeof statusColors] || "bg-graphite-800 text-graphite-300 border-graphite-700";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-450" /> Acompanhar Chamado
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="track-protocol">Número do protocolo ou ID do chamado</Label>
            <div className="flex gap-2">
              <Input
                id="track-protocol"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: 2026-0001"
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-graphite-500">Digite o número da O.S. enviado pelo WhatsApp ou e-mail.</p>
          </div>

          {error && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-danger mt-0.5" />
              <div>
                <p className="font-medium text-sm">Chamado não encontrado</p>
                <p className="text-xs text-graphite-400">Verifique o número do protocolo e tente novamente.</p>
              </div>
            </div>
          )}

          {order && (
            <div className="space-y-4">
              <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-graphite-400">Protocolo</span>
                  <span className="font-semibold text-emerald-450">#{order.number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-graphite-400">Status atual</span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border",
                      displayStatusColor(order.status)
                    )}
                  >
                    {displayStatus(order.status)}
                  </span>
                </div>

                <div className="pt-3 border-t border-graphite-800 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-graphite-300">
                    <User className="w-4 h-4 text-emerald-450" /> {order.client.fullName}
                  </div>
                  <div className="flex items-center gap-2 text-graphite-300">
                    <FileText className="w-4 h-4 text-emerald-450" /> {formatPhone(order.client.phone)}
                  </div>
                  <div className="flex items-center gap-2 text-graphite-300">
                    <Calendar className="w-4 h-4 text-emerald-450" /> Aberto em{" "}
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3">Histórico de atualizações</h4>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-graphite-500">Nenhuma atualização registrada.</p>
                  ) : (
                    history.map((h) => (
                      <div
                        key={h.id}
                        className="relative pl-6 border-l-2 border-graphite-800 pb-3 last:pb-0"
                      >
                        <div
                          className={cn(
                            "absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-graphite-900",
                            h.status === "finalizado"
                              ? "border-emerald-450"
                              : "border-graphite-600"
                          )}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full border w-fit",
                              displayStatusColor(h.status)
                            )}
                          >
                            {displayStatus(h.status)}
                          </span>
                          <span className="text-xs text-graphite-500">
                            {new Date(h.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        {h.note && (
                          <p className="text-sm text-graphite-400 mt-1">{h.note}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {!order && !error && !loading && (
            <div className="text-center py-6 text-graphite-500">
              <Clock className="w-10 h-10 mx-auto mb-2 text-graphite-600" />
              <p className="text-sm">Informe o protocolo para visualizar o status do chamado.</p>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
