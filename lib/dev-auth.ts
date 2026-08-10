import type { Role } from "@/lib/session"

/**
 * Bypass de login para desarrollo local.
 *
 * Con `DEV_BYPASS_AUTH=true` en `.env.local`, la app se comporta como si
 * hubiera un usuario logueado: no pide credenciales y el proxy deja pasar
 * todas las rutas. Sirve para recorrer el sistema sin Supabase.
 *
 * SEGURIDAD: doble candado. Además del flag, exige que NODE_ENV no sea
 * "production", así un `.env` mal copiado a producción no abre la app.
 * `next build` fija NODE_ENV=production, o sea que en un deploy real esto
 * queda muerto sí o sí.
 */
export const DEV_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_BYPASS_AUTH === "true"

/** Rol del usuario falso. Cambialo con DEV_BYPASS_ROLE en `.env.local`. */
const ROLES_VALIDOS: Role[] = ["alumno", "profesor", "admin"]

const rolPedido = process.env.DEV_BYPASS_ROLE as Role | undefined

export const DEV_BYPASS_ROLE: Role =
  rolPedido && ROLES_VALIDOS.includes(rolPedido) ? rolPedido : "admin"

/**
 * Con `DEV_BYPASS_USER_ID` apuntando a un `perfiles.user_id` real, el bypass
 * se hace pasar por ESE usuario en vez de por uno inventado. Es lo que
 * permite probar el scoping de verdad en local sin poder loguearse.
 */
export const DEV_BYPASS_USER_ID = process.env.DEV_BYPASS_USER_ID || null
