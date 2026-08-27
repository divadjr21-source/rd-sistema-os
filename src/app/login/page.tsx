"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, getMyProfile } from "@/services/storage";
import { Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        // Técnico não tem acesso ao Dashboard, então já entra direto na
        // tela de Ordens de Serviço em vez de cair numa tela bloqueada.
        const profile = await getMyProfile();
        router.replace(profile?.role === "admin" ? "/painel" : "/painel/os");
      } else {
        setError(true);
      }
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
          <h1 className="text-2xl font-bold">Área do Técnico</h1>
          <p className="text-sm text-graphite-400 mt-1">RD Solutions</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(false);
              }}
              placeholder="admin@rdsolutions.com.br"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-danger">Email ou senha incorretos.</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
