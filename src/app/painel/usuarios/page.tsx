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
import { UserPlus, ShieldCheck, User, Power, AlertTriangle, Copy, Check, RefreshCw, KeyRound, Trash2 } from "lucide-react";
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

function generatePassword() {
  // 10 caracteres, fácil de digitar (sem símbolos ambíguos tipo 0/O, 1/l).
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function UsuariosPage() {
  const [profiles, setProfiles] = useState<TechnicianProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<TechnicianProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TechnicianProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [resetTarget, setResetTarget] = useState<TechnicianProfile | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const [form, setForm] = useState({ fullName: "", email: "", password: generatePassword() });
  const [copied, setCopied] = useState(false);

  // Guarda as credenciais logo após cadastrar, pra mostrar em tela (a senha
  // não fica salva em nenhum lugar visível depois disso — é só nesse
  // momento, o admin precisa copiar/enviar agora).
  const [createdCredentials, setCreatedCredentials] = useState<{ fullName: string; email: string; password: string } | null>(
    null
  );

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

  const resetCreateForm = () => setForm({ fullName: "", email: "", password: generatePassword() });

  const handleCreate = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar técnico.");
      setCreatedCredentials({ fullName: form.fullName, email: form.email, password: form.password });
      setModalOpen(false);
      resetCreateForm();
      await refresh();
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

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao excluir técnico.");
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const openReset = (p: TechnicianProfile) => {
    setResetTarget(p);
    setResetPassword(generatePassword());
  };

  const handleResetPassword = async () => {
    if (!resetTarget || resetSubmitting) return;
    setResetSubmitting(true);
    try {
      const res = await fetch("/api/admin/technicians", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetTarget.id, password: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao redefinir senha.");
      setCreatedCredentials({ fullName: resetTarget.full_name, email: resetTarget.email, password: resetPassword });
      setResetTarget(null);
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setResetSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `RD Solutions - Acesso ao painel\nLink: ${window.location.origin}/login\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const siteOrigin = typeof window !== "undefined" ? window.location.origin : "";

  const whatsappCredentialsUrl = createdCredentials
    ? `https://api.whatsapp.com/send?text=${encodeURIComponent(
        `Olá ${createdCredentials.fullName}! Segue seu acesso ao painel da RD Solutions:\n\nLink: ${siteOrigin}/login\nE-mail: ${createdCredentials.email}\nSenha: ${createdCredentials.password}\n\nRecomendo trocar a senha após o primeiro acesso.`
      )}`
    : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Usuários</h1>
          <p className="text-sm text-graphite-400 mt-1">Cadastre técnicos com acesso limitado ao painel.</p>
        </div>
        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (open) resetCreateForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Cadastrar Técnico
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Técnico</DialogTitle>
              <DialogDescription>
                Defina o e-mail e a senha de acesso. Depois de cadastrar, você poderá copiar as credenciais e enviar
                para o técnico por WhatsApp ou outro canal — não é necessário e-mail.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
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
                <p className="text-xs text-graphite-500">
                  Usado só como login — não é necessário que o técnico tenha acesso a essa caixa de e-mail.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Gerar nova senha"
                    onClick={() => setForm({ ...form, password: generatePassword() })}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="w-full gap-2">
                  <UserPlus className="w-4 h-4" /> {submitting ? "Cadastrando..." : "Cadastrar Técnico"}
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
              className="flex flex-wrap items-center justify-between gap-4 bg-graphite-900 border border-graphite-800 rounded-xl p-4"
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
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openReset(p)}>
                      <KeyRound className="w-3.5 h-3.5" />
                      Redefinir senha
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setToggleTarget(p)}>
                      <Power className="w-3.5 h-3.5" />
                      {p.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-danger border-danger/30 hover:bg-danger/10"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmação de ativar/desativar */}
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

      {/* Redefinir senha de um técnico existente */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redefinir senha de {resetTarget?.full_name}</DialogTitle>
            <DialogDescription>A senha atual dele deixa de funcionar assim que você confirmar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reset-password">Nova senha</Label>
            <div className="flex gap-2">
              <Input
                id="reset-password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                minLength={6}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setResetPassword(generatePassword())}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleResetPassword} disabled={resetSubmitting}>
              {resetSubmitting ? "Salvando..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão definitiva */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="w-5 h-5" />
              Excluir {deleteTarget?.full_name}?
            </DialogTitle>
            <DialogDescription>
              Essa ação é <strong>permanente</strong> e não pode ser desfeita. O login desse técnico deixa de
              funcionar imediatamente. As O.S. que estavam atribuídas a ele não são excluídas — elas ficam sem
              técnico responsável até você atribuir a outra pessoa.
              <br />
              <br />
              Se for algo temporário (férias, afastamento), considere usar <strong>Desativar</strong> em vez de
              excluir — assim você mantém o histórico e pode reativar depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir Definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credenciais recém-criadas/redefinidas, prontas para copiar/enviar */}
      <Dialog open={!!createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-450">
              <Check className="w-5 h-5" /> Acesso pronto
            </DialogTitle>
            <DialogDescription>
              Copie ou envie essas credenciais para {createdCredentials?.fullName} agora — a senha não vai aparecer
              de novo depois de fechar esta janela.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-graphite-950 border border-graphite-800 rounded-xl p-4 space-y-2 text-sm font-mono">
            <p>
              <span className="text-graphite-500">Link:</span> {siteOrigin}/login
            </p>
            <p>
              <span className="text-graphite-500">E-mail:</span> {createdCredentials?.email}
            </p>
            <p>
              <span className="text-graphite-500">Senha:</span> {createdCredentials?.password}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={copyCredentials} className="gap-2">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </Button>
            <a href={whatsappCredentialsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button type="button" className="w-full">
                Enviar por WhatsApp
              </Button>
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
