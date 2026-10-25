import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServer() {
  const jar = await cookies();
  const publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, publicKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items: Array<{ name: string; value: string; options?: Parameters<typeof jar.set>[2] }>) => {
        try {
          items.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {}
      }
    }
  });
}
