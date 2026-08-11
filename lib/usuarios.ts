import "server-only"

import { db } from "@/lib/db"
import { perfiles } from "@/lib/db/schema"
import { requireRole, type Role } from "@/lib/session"
import { createAdminClient } from "@/lib/supabase/admin"
import { registrar } from "@/lib/auditoria"
import { notificar } from "@/lib/notificaciones"
import { ANIOS, DIVISIONES } from "@/lib/grades"

/**
 * Alta de usuarios desde el panel del admin (el preceptor).
 *
 * El signup público solo crea alumnos sin curso y a la espera de que alguien
 * los ubique. Esto es la otra puerta: el preceptor da de alta a la persona
 * con su rol y su curso ya puestos, y con la contraseña inicial que le va a
 * entregar en mano.
 *
 * Usa la service role key (`lib/supabase/admin.ts`), así que el chequeo de
 * `requireRole("admin")` de la primera línea es la única cosa que separa esto
 * de una toma total del proyecto. No lo muevas de ahí.
 */

const ROLES_VALIDOS: Role[] = ["alumno", "profesor", "admin"]

/** A propósito laxo: la verdad sobre si un mail existe la tiene el servidor. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MIN_PASSWORD = 8

export interface NuevoUsuario {
  email: string
  nombre: string
  rol: string
  password: string
  anio?: string | null
  division?: string | null
}

export type ResultadoAlta =
  | { ok: true; userId: string }
  | { ok: false; error: string }

export async function crearUsuario(
  input: NuevoUsuario,
): Promise<ResultadoAlta> {
  const admin = await requireRole("admin")

  const email = input.email.trim().toLowerCase()
  const nombre = input.nombre.trim()

  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "El correo no parece válido" }
  }
  if (nombre.length < 2) {
    return { ok: false, error: "Poné el nombre y el apellido" }
  }
  if (!ROLES_VALIDOS.includes(input.rol as Role)) {
    return { ok: false, error: "Rol inválido" }
  }
  if (input.password.length < MIN_PASSWORD) {
    return {
      ok: false,
      error: `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres`,
    }
  }

  const rol = input.rol as Role

  // El curso es solo del alumno: un profesor no tiene curso propio, sus
  // alumnos salen de sus cátedras. Si viene para otro rol, se descarta.
  const anio = rol === "alumno" ? (input.anio || null) : null
  const division = rol === "alumno" ? (input.division || null) : null

  if (anio && !ANIOS.includes(anio as (typeof ANIOS)[number])) {
    return { ok: false, error: "Año inválido" }
  }
  if (
    division &&
    !DIVISIONES.includes(division as (typeof DIVISIONES)[number])
  ) {
    return { ok: false, error: "División inválida" }
  }

  const supabase = createAdminClient()

  // `email_confirm: true` porque lo da de alta el preceptor en persona: no
  // hay mail de confirmación que mandar, y hoy el proyecto ni siquiera tiene
  // SMTP configurado.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: nombre },
  })

  if (error || !data.user) {
    const msg = error?.message ?? "No se pudo crear el usuario"
    // El caso frecuente, dicho en castellano.
    if (/already been registered|already exists/i.test(msg)) {
      return { ok: false, error: "Ya existe un usuario con ese correo" }
    }
    return { ok: false, error: msg }
  }

  const userId = data.user.id

  try {
    await db.transaction(async (tx) => {
      // El trigger `on_auth_user_created` ya creó el perfil como alumno sin
      // curso. Acá se le pone lo que eligió el admin. Si por lo que sea el
      // trigger no corrió, el upsert lo crea igual.
      await tx
        .insert(perfiles)
        .values({ userId, nombre, rol, anio, division })
        .onConflictDoUpdate({
          target: perfiles.userId,
          set: { nombre, rol, anio, division },
        })

      await registrar(
        admin,
        {
          accion: "usuario.crear",
          entidad: "perfil",
          entidadId: userId,
          detalle: { email, nombre, rol, anio, division },
        },
        tx,
      )

      await notificar(
        [
          {
            userId,
            tipo: "bienvenida",
            titulo: "Tu cuenta del campus está lista",
            cuerpo: `${admin.name} te dio de alta como ${rol}. Cambiá tu contraseña la primera vez que entres.`,
            link: "/",
          },
        ],
        tx,
      )
    })
  } catch (e) {
    // Si el perfil no se pudo dejar como corresponde, el usuario de auth
    // quedaría creado pero como alumno sin curso, sin que nadie se entere.
    // Se deshace el alta para que el admin la reintente.
    await supabase.auth.admin.deleteUser(userId).catch(() => {})
    const detalle = e instanceof Error ? e.message : String(e)
    console.error(`[usuarios] alta revertida para ${email}: ${detalle}`)
    return { ok: false, error: "No se pudo completar el alta. Probá de nuevo." }
  }

  return { ok: true, userId }
}
