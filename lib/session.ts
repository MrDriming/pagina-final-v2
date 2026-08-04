import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export type Role = "alumno" | "profesor" | "admin"

export interface SessionUser {
  id: string
  name: string
  email: string
  role: Role
  anio: string | null
  division: string | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const u = session.user as unknown as {
    id: string
    name: string
    email: string
    role?: string
    anio?: string | null
    division?: string | null
  }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: (u.role as Role) ?? "alumno",
    anio: u.anio ?? null,
    division: u.division ?? null,
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
