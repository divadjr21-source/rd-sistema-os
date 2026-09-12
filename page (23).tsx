"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Shield, CheckCircle } from "lucide-react";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // O link do convite/redefinição de senha do Supabase já cria uma sessão
    // temporária automaticamente ao carregar a página (via token na URL).
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setCheckingSession(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.replace("/painel"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível definir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-graphite-900 border border-graphite-800 rounded-2xl p-8 shadow-card">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-emerald-450 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-graphite-950" />
          </div>
          <h1 className="text-2xl font-bold">Defina sua senha</h1>
          <p className="text-sm text-graphite-400 mt-1 text-center">
            Você foi convidado para acessar o painel técnico. Crie uma senha para continuar.
          </p>
        </div>

        {checkingSession ? (
          <p className="text-center text-sm text-graphite-400">Verificando convite...</p>
        ) : !hasSession ? (
          <p className="text-center text-sm text-danger">
            Link inválido ou expirado. Peça ao administrador para enviar um novo convite.
          </p>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 text-emerald-450">
            <CheckCircle className="w-8 h-8" />
            <p className="text-sm">Senha definida! Entrando no painel...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Salvando..." : "Definir senha e entrar"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
