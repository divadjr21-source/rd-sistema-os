import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, Wrench, ClipboardList, MessageCircle } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-graphite-800 bg-graphite-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-450 flex items-center justify-center">
              <span className="font-bold text-graphite-950 text-lg">RD</span>
            </div>
            <span className="font-semibold">RD Solutions</span>
          </div>
          <Link href="/painel">
            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="w-4 h-4" /> Área do Técnico
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-450/10 border border-emerald-450/20 text-emerald-450 text-sm">
            <Wrench className="w-4 h-4" />
            Sistema de Gestão de Serviços Técnicos
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Gestão de O.S. para{" "}
            <span className="text-emerald-450">CFTV, Elétrica e Segurança</span>
          </h1>

          <p className="text-lg text-graphite-400">
            Abra chamados de forma simples pelo celular e gerencie orçamentos, clientes e ordens de serviço em um painel profissional.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chamado" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2">
                <MessageCircle className="w-5 h-5" /> Abrir Chamado
              </Button>
            </Link>
            <Link href="/painel" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full gap-2">
                <ClipboardList className="w-5 h-5" /> Acessar Painel
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
