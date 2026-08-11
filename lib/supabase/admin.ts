import "server-only"

import { createClient } from "@supabase/supabase-js"

/**
 * Cliente con la SERVICE ROLE KEY. Saltea RLS y puede crear, borrar y
 * modificar usuarios de `auth.users`. Es la llave maestra del proyecto.
 *
 * Reglas:
 * - Solo se importa desde módulos "server-only". Nunca desde un componente
 *   de cliente, ni desde nada que termine en el bundle del browser.
 * - La variable se llama `SUPABASE_SERVICE_ROLE_KEY`, SIN el prefijo
 *   `NEXT_PUBLIC_`. Ese prefijo la publicaría en el HTML.
 * - Quien lo use tiene que haber pasado antes por `requireRole("admin")`.
 *   Este módulo no chequea permisos: solo da acceso.
 *
 * `persistSession: false` porque no hay usuario ni cookies acá: es una
 * conexión de servidor a servidor.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_URL). " +
        "Se saca de Supabase > Project Settings > API Keys, y va como " +
        "variable de entorno del servidor, nunca en el cliente.",
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
