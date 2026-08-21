import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@supabase/supabase-js";
import { createClient as createSsrClient } from "@/lib/supabase/server";

// Esta rota roda no SERVIDOR (nunca no navegador). Ela usa a
// SUPABASE_SERVICE_ROLE_KEY, que tem privilégios administrativos totais no
// Supabase — por isso NUNCA é exposta ao front-end (não tem prefixo
// NEXT_PUBLIC_) e só é lida aqui dentro.
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione essa variável de ambiente na Vercel (Project Settings > Environment Variables) com o valor da 'service_role' key do Supabase (Project Settings > API)."
    );
  }
  return createServerClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Confirma que quem está chamando a rota é um admin autenticado.
async function requireAdmin() {
  const supabase = await createSsrClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado.", status: 401 } as const;

  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();

  if (!profile || profile.role !== "admin" || !profile.active) {
    return { error: "Apenas administradores podem gerenciar usuários.", status: 403 } as const;
  }
  return { user } as const;
}

// GET: lista todos os técnicos cadastrados
export async function GET() {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const supabase = await createSsrClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Busca o e-mail de cada usuário (não fica salvo em profiles, só no Auth)
  const admin = getAdminClient();
  const withEmail = await Promise.all(
    (data || []).map(async (p) => {
      const { data: authUser } = await admin.auth.admin.getUserById(p.id);
      return { ...p, email: authUser?.user?.email || "" };
    })
  );

  return NextResponse.json({ profiles: withEmail });
}

// POST: convida um novo técnico por e-mail
export async function POST(req: NextRequest) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const { email, fullName } = await req.json();
    if (!email || !fullName) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios." }, { status: 400 });
    }

    const admin = getAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, role: "tecnico" },
      redirectTo: `${siteUrl}/definir-senha`,
    });

    if (error) throw error;

    // Garante o perfil (a trigger já deveria ter criado, isso é reforço)
    if (data.user) {
      await admin
        .from("profiles")
        .upsert({ id: data.user.id, full_name: fullName, role: "tecnico", active: true }, { onConflict: "id" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível convidar o técnico.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PATCH: ativa/desativa um técnico
export async function PATCH(req: NextRequest) {
  const check = await requireAdmin();
  if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

  try {
    const { id, active } = await req.json();
    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
    }

    const admin = getAdminClient();
    const { error } = await admin.from("profiles").update({ active }).eq("id", id);
    if (error) throw error;

    // Também bloqueia/libera o login diretamente no Auth por segurança extra.
    await admin.auth.admin.updateUserById(id, {
      ban_duration: active ? "none" : "876000h", // ~100 anos = efetivamente banido
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível atualizar o técnico.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
