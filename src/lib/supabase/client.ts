import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Retorna um cliente stub para não quebrar builds estáticas sem variáveis.
    // O erro real será visível no runtime quando as chamadas falharem.
    if (typeof window === "undefined") {
      return {
        auth: {
          signInWithPassword: async () => ({ error: new Error("Missing Supabase env vars") }),
          signOut: async () => ({ error: null }),
          getUser: async () => ({ data: { user: null }, error: new Error("Missing Supabase env vars") }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        },
        from: () => ({
          select: () => ({ error: new Error("Missing Supabase env vars") }),
          insert: () => ({ error: new Error("Missing Supabase env vars") }),
          update: () => ({ error: new Error("Missing Supabase env vars") }),
          delete: () => ({ error: new Error("Missing Supabase env vars") }),
          upsert: () => ({ error: new Error("Missing Supabase env vars") }),
        }),
      } as unknown as ReturnType<typeof createBrowserClient>;
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createBrowserClient(url, key);
}
