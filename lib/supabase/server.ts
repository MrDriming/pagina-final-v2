import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Importante con Fluid compute: no guardar este cliente en una variable global.
 * Siempre crear uno nuevo dentro de cada función que lo use.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // `setAll` llamado desde un Server Component. Se puede ignorar
            // porque el proxy ya refresca la sesión en cada request.
          }
        },
      },
    },
  )
}
