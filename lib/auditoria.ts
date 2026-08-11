import "server-only"

import { and, desc, eq, gte, type SQL } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditoria } from "@/lib/db/schema"
import { requireRole, type SessionUser } from "@/lib/session"

/**
 * Registro de auditoría.
 *
 * Dos reglas que conviene no romper:
 *
 * 1. `registrar` NO atrapa errores. Si falla el insert, falla la operación
 *    entera. Una auditoría que se pierde en silencio deja de servir como
 *    prueba, que es lo único para lo que existe. Por eso además se llama
 *    dentro de la transacción de quien la usa: o quedan las dos cosas, o no
 *    queda ninguna.
 *
 * 2. El nombre y el rol del actor se copian, no se joinean. Ver el comentario
 *    de la tabla en `lib/db/schema.ts`.
 */

/**
 * `db` y el `tx` de una transacción no comparten tipo, pero sí este pedazo.
 * Alcanza para que `registrar` sirva en los dos casos sin genéricos raros.
 */
type Ejecutor = Pick<typeof db, "insert">

export type Accion =
  | "usuario.crear"
  | "usuario.rol"
  | "usuario.curso"
  | "catedra.asignar"
  | "catedra.quitar"
  | "nota.guardar"

export interface Evento {
  accion: Accion
  entidad: "perfil" | "catedra" | "calificacion"
  entidadId?: string | null
  detalle?: Record<string, unknown>
}

export interface FilaAuditoria {
  id: string
  actorId: string | null
  actorNombre: string
  actorRol: string
  accion: string
  entidad: string
  entidadId: string | null
  detalle: Record<string, unknown> | null
  createdAt: Date | null
}

/**
 * Deja constancia de una acción. El `actor` viene resuelto del servidor
 * (`requireUser` / `requireRole`), nunca del formulario.
 */
export async function registrar(
  actor: Pick<SessionUser, "id" | "name" | "role">,
  evento: Evento,
  ejecutor: Ejecutor = db,
): Promise<void> {
  await ejecutor.insert(auditoria).values({
    actorId: actor.id,
    actorNombre: actor.name,
    actorRol: actor.role,
    accion: evento.accion,
    entidad: evento.entidad,
    entidadId: evento.entidadId ?? null,
    detalle: evento.detalle ?? null,
  })
}

export interface FiltrosAuditoria {
  accion?: string
  actorId?: string
  /** Solo eventos de los últimos N días. */
  dias?: number
}

const LIMITE = 200

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** El listado que ve el admin. Nadie más puede leer la auditoría. */
export async function listarAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<FilaAuditoria[]> {
  await requireRole("admin")

  // Un actorId con formato inválido devuelve vacío en vez de ignorar el
  // filtro: ignorarlo mostraría MÁS filas de las pedidas.
  if (filtros.actorId && !UUID_RE.test(filtros.actorId)) return []

  const condiciones: SQL[] = []
  if (filtros.accion) condiciones.push(eq(auditoria.accion, filtros.accion))
  if (filtros.actorId) condiciones.push(eq(auditoria.actorId, filtros.actorId))
  if (filtros.dias && Number.isFinite(filtros.dias)) {
    const desde = new Date(Date.now() - filtros.dias * 24 * 60 * 60 * 1000)
    condiciones.push(gte(auditoria.createdAt, desde))
  }

  return db
    .select()
    .from(auditoria)
    .where(condiciones.length ? and(...condiciones) : undefined)
    .orderBy(desc(auditoria.createdAt))
    .limit(LIMITE)
}
