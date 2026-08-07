import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Shield, MessageCircle, ClipboardList } from "lucide-react";
import TrackOrderModal from "@/components/track-order-modal";

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-450/10 border border-emerald-450/20">
            <MessageCircle className="w-8 h-8 text-emerald-450" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Bem-vindo ao App da{" "}
            <span className="text-emerald-450">RD Solutions</span>
          </h1>

          <p className="text-lg text-graphite-400">
            Conte com nossa equipe especializada para manter seu ambiente seguro e funcionando sempre.
          </p>

          <p className="text-sm text-graphite-300">Abra seu chamado de forma rápida e prática.</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chamado" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2">
                <MessageCircle className="w-5 h-5" /> Abrir Chamado
              </Button>
            </Link>
            <TrackOrderModal trigger=
              {<Button size="lg" variant="outline" className="w-full gap-2">
                <ClipboardList className="w-5 h-5" /> Acompanhar Chamados
              </Button>
            } />
          </div>

          <p className="text-xs text-graphite-500 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Seus dados e solicitações estão protegidos.
          </p>
        </div>
      </main>
    </div>
  );
}
