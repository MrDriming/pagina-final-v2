import "server-only"
import { eq } from "drizzle-orm"
import { createClient } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { perfiles } from "@/lib/db/schema"
import { DEV_AUTH_BYPASS, DEV_BYPASS_ROLE, DEV_BYPASS_USER_ID } from "@/lib/dev-auth"

export type Role = "alumno" | "profesor" | "admin"

const ROLES_VALIDOS: Role[] = ["alumno", "profesor", "admin"]

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  anio: string | null
  division: string | null
}

function normalizarRol(valor: unknown): Role {
  return ROLES_VALIDOS.includes(valor as Role) ? (valor as Role) : "alumno"
}

/**
 * Usuario logueado, o null. Combina la identidad de Supabase Auth
 * (`auth.users`) con el perfil de la app (`public.perfiles`).
 *
 * El perfil se lee por Drizzle sobre la conexión directa a Postgres, que
 * corre como `postgres` y saltea RLS. Es server-only a propósito: el
 * browser nunca toca `perfiles`, y el rol nunca sale del cliente.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  // Bypass de desarrollo: usuario falso, sin tocar Supabase ni la DB.
  if (DEV_AUTH_BYPASS) {
    // Si DEV_BYPASS_USER_ID está seteado, buscá el usuario real en la base
    if (DEV_BYPASS_USER_ID) {
      const [perfil] = await db
        .select()
        .from(perfiles)
        .where(eq(perfiles.userId, DEV_BYPASS_USER_ID))
        .limit(1)

      if (perfil) {
        return {
          id: DEV_BYPASS_USER_ID,
          name: perfil.nombre,
          email: "dev@localhost",
          role: normalizarRol(perfil.rol),
          anio: perfil.anio,
          division: perfil.division,
        }
      }

      // Si el id no existe, logueá un warning
      console.warn(
        `[DEV] DEV_BYPASS_USER_ID="${DEV_BYPASS_USER_ID}" no encontrado en perfiles`
      )
    }

    return {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Usuario de Desarrollo",
      email: "dev@localhost",
      role: DEV_BYPASS_ROLE,
      anio: null,
      division: null,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (error || !claims?.sub) return null

  const id = claims.sub as string
  const email = (claims.email as string) ?? ""
  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>

  const [perfil] = await db
    .select()
    .from(perfiles)
    .where(eq(perfiles.userId, id))
    .limit(1)

  // Si el trigger todavía no corrió, caemos a lo que vino en el signup.
  return {
    id,
    name: perfil?.nombre || (metadata.name as string) || email,
    email,
    role: normalizarRol(perfil?.rol ?? metadata.role),
    anio: perfil?.anio ?? (metadata.anio as string) ?? null,
    division: perfil?.division ?? (metadata.division as string) ?? null,
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) {
    throw new Error("No tenés permiso para realizar esta acción")
  }
  return user
}
