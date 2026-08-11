import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { notificaciones } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { safeRedirectPath } from "@/lib/safe-redirect"

/**
 * Notificaciones de la campana.
 *
 * Una fila por destinatario: si un hecho le importa a tres personas, se
 * escriben tres filas. Marcar como leída es entonces un UPDATE sobre la fila
 * propia, sin tabla de "leídas" aparte.
 *
 * A diferencia de `lib/auditoria.ts`, esto sí se puede perder sin drama, pero
 * igual se escribe dentro de la transacción de quien lo dispara: no vale la
 * pena el código extra para tolerar el fallo.
 */

type Ejecutor = Pick<typeof db, "insert">

export type TipoNotificacion =
  | "nota"
  | "rol"
  | "curso"
  | "catedra"
  | "bienvenida"

export interface NuevaNotificacion {
  userId: string
  tipo: TipoNotificacion
  titulo: string
  cuerpo?: string
  /** Ruta interna. Se sanitiza igual que los redirects de auth. */
  link?: string
}

export interface Notificacion {
  id: string
  tipo: string
  titulo: string
  cuerpo: string
  link: string | null
  leidaAt: Date | null
  createdAt: Date | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cuántas trae la campana. Más que esto no se lee de un vistazo. */
const LIMITE = 20

/**
 * Crea notificaciones. No recibe el destinatario del cliente: quien la llama
 * lo resuelve del lado del servidor (el alumno dueño de la nota, el profesor
 * de la cátedra, etc).
 */
export async function notificar(
  nuevas: NuevaNotificacion[],
  ejecutor: Ejecutor = db,
): Promise<void> {
  if (nuevas.length === 0) return

  await ejecutor.insert(notificaciones).values(
    nuevas.map((n) => ({
      userId: n.userId,
      tipo: n.tipo,
      titulo: n.titulo,
      cuerpo: n.cuerpo ?? "",
      link: n.link ? safeRedirectPath(n.link) : null,
    })),
  )
}

/** Las del usuario logueado. Nunca recibe un id: siempre es él mismo. */
export async function misNotificaciones(): Promise<Notificacion[]> {
  const user = await requireUser()

  return db
    .select({
      id: notificaciones.id,
      tipo: notificaciones.tipo,
      titulo: notificaciones.titulo,
      cuerpo: notificaciones.cuerpo,
      link: notificaciones.link,
      leidaAt: notificaciones.leidaAt,
      createdAt: notificaciones.createdAt,
    })
    .from(notificaciones)
    .where(eq(notificaciones.userId, user.id))
    .orderBy(desc(notificaciones.createdAt))
    .limit(LIMITE)
}

export async function contarNoLeidas(): Promise<number> {
  const user = await requireUser()

  const [fila] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notificaciones)
    .where(
      and(
        eq(notificaciones.userId, user.id),
        isNull(notificaciones.leidaAt),
      ),
    )

  return fila?.n ?? 0
}

export async function marcarLeida(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()

  if (!UUID_RE.test(id)) return { ok: false, error: "Identificador inválido" }

  // El `userId` en el WHERE es lo que impide marcar la notificación de otro.
  // No alcanza con leerla antes: hay que acotar el propio UPDATE.
  await db
    .update(notificaciones)
    .set({ leidaAt: new Date() })
    .where(
      and(eq(notificaciones.id, id), eq(notificaciones.userId, user.id)),
    )

  return { ok: true }
}

export async function marcarTodasLeidas(): Promise<{ ok: boolean }> {
  const user = await requireUser()

  await db
    .update(notificaciones)
    .set({ leidaAt: new Date() })
    .where(
      and(
        eq(notificaciones.userId, user.id),
        isNull(notificaciones.leidaAt),
      ),
    )

  return { ok: true }
}
