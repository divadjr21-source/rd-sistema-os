"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, logout, getMyProfile, MyProfile } from "@/services/storage";
import {
  LayoutDashboard,
  ClipboardList,
  Tags,
  Users,
  Building2,
  FileText,
  LogOut,
  Menu,
  X,
  CalendarDays,
  Receipt,
  BarChart3,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/painel", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { href: "/painel/os", label: "Ordens de Serviço", icon: ClipboardList, adminOnly: false },
  { href: "/painel/orcamentos", label: "Orçamentos", icon: FileText, adminOnly: false },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays, adminOnly: false },
  { href: "/painel/contratos", label: "Contratos", icon: Receipt, adminOnly: false },
  { href: "/painel/catalogo", label: "Catálogo", icon: Tags, adminOnly: false },
  { href: "/painel/clientes", label: "Clientes", icon: Users, adminOnly: false },
  { href: "/painel/relatorios", label: "Relatórios", icon: BarChart3, adminOnly: true },
  { href: "/painel/usuarios", label: "Usuários", icon: UserCog, adminOnly: true },
  { href: "/painel/empresa", label: "Empresa", icon: Building2, adminOnly: true },
];

// Rotas que só o Admin pode acessar, mesmo digitando o link direto.
const ADMIN_ONLY_PREFIXES = ["/painel/relatorios", "/painel/usuarios", "/painel/empresa"];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);

  useEffect(() => {
    isAuthenticated().then(async (ok) => {
      if (!ok) {
        router.replace("/login");
        return;
      }
      const p = await getMyProfile();
      if (p && !p.active) {
        await logout();
        router.replace("/login");
        return;
      }
      setProfile(p);
      // Bloqueia acesso direto a rotas de admin digitando a URL.
      if (p && p.role !== "admin" && ADMIN_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        router.replace("/painel");
        return;
      }
      setLoading(false);
    });
  }, [router, pathname]);

  const visibleNav = nav.filter((item) => !item.adminOnly || profile?.role === "admin");

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-10 w-10 border-4 border-emerald-450 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden lg:flex w-64 flex-col bg-graphite-900 border-r border-graphite-800">
        <div className="h-16 flex items-center px-6 border-b border-graphite-800">
          <div className="h-9 w-9 rounded-lg bg-emerald-450 flex items-center justify-center mr-3">
            <span className="font-bold text-graphite-950 text-lg">RD</span>
          </div>
          <div>
            <p className="font-semibold">RD Solutions</p>
            <p className="text-xs text-graphite-400">Painel Técnico</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition",
                  active
                    ? "bg-emerald-450/15 text-emerald-450"
                    : "text-graphite-300 hover:bg-graphite-800 hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-graphite-800">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden h-16 bg-graphite-900 border-b border-graphite-800 flex items-center justify-between px-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-450 flex items-center justify-center">
              <span className="font-bold text-graphite-950">RD</span>
            </div>
            <span className="font-semibold">Painel Técnico</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </header>

        {mobileOpen && (
          <div className="lg:hidden bg-graphite-900 border-b border-graphite-800 p-3 space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                    active
                      ? "bg-emerald-450/15 text-emerald-450"
                      : "text-graphite-300 hover:bg-graphite-800"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
            <Button
              variant="outline"
              className="w-full justify-start mt-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair
            </Button>
          </div>
        )}

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
