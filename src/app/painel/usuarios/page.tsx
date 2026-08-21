"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { UserPlus, Mail, ShieldCheck, User, Power, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractErrorMessage } from "@/hooks/use-toast";

type TechnicianProfile = {
  id: string;
  full_name: string;
  role: "admin" | "tecnico";
  active: boolean;
  created_at: string;
  email: string;
};

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<TechnicianProfile | null>(null);

  const [form, setForm] = useState({ fullName: "", email: "" });

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/admin/technicians");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar usuários.");
      setProfiles(data.profiles || []);
    } catch (error) {
      setLoadError(extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao convidar técnico.");
      setForm({ fullName: "", email: "" });
      setModalOpen(false);
      await refresh();
      alert("Convite enviado! O técnico vai receber um e-mail para definir a senha.");
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: toggleTarget.id, active: !toggleTarget.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar técnico.");
      setToggleTarget(null);
      await refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-graphite-400 mt-1">Cadastre técnicos com acesso limitado ao painel.</p>
        </div>
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Convidar Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Técnico</DialogTitle>
              <DialogDescription>
                O técnico vai receber um e-mail com um link para definir a própria senha e acessar o painel com
                permissões limitadas.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nome do técnico"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tecnico@email.com"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  <Mail className="w-4 h-4" /> {submitting ? "Enviando..." : "Enviar Convite"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-graphite-400 text-sm">Carregando usuários...</p>
      ) : loadError ? (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4 text-sm text-danger">{loadError}</div>
      ) : profiles.length === 0 ? (
        <p className="text-graphite-400 text-sm">Nenhum usuário cadastrado ainda.</p>
      ) : (
        <div className="grid gap-3">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-4 bg-graphite-900 border border-graphite-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    p.role === "admin" ? "bg-amber-500/15 text-amber-400" : "bg-emerald-450/15 text-emerald-450"
                  )}
                >
                  {p.role === "admin" ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.full_name || "(sem nome)"}</p>
                  <p className="text-xs text-graphite-400 truncate">{p.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    p.role === "admin" ? "bg-amber-500/15 text-amber-400" : "bg-graphite-800 text-graphite-300"
                  )}
                >
                  {p.role === "admin" ? "Admin" : "Técnico"}
                </span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    p.active ? "bg-emerald-450/15 text-emerald-450" : "bg-danger/15 text-danger"
                  )}
                >
                  {p.active ? "Ativo" : "Desativado"}
                </span>
                {p.role !== "admin" && (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setToggleTarget(p)}>
                    <Power className="w-3.5 h-3.5" />
                    {p.active ? "Desativar" : "Ativar"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!toggleTarget} onOpenChange={(open) => !open && setToggleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {toggleTarget?.active ? "Desativar técnico?" : "Ativar técnico?"}
            </DialogTitle>
            <DialogDescription>
              {toggleTarget?.active
                ? `${toggleTarget?.full_name} não vai mais conseguir acessar o painel até ser reativado.`
                : `${toggleTarget?.full_name} vai voltar a ter acesso ao painel.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggleTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleToggleActive}>{toggleTarget?.active ? "Desativar" : "Ativar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
