import "server-only"

import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { catedras, materias, perfiles } from "@/lib/db/schema"
import { requireUser, requireRole } from "@/lib/session"
import type { CatedraScope } from "@/lib/permisos"
import { DIVISIONES } from "@/lib/grades"

export interface Catedra {
  id: string
  materiaId: string
  materiaNombre: string
  anio: string
  division: string
  profesorId: string
}

/** Cátedras de un profesor, con el nombre y el año de la materia resueltos. */
export async function listarCatedras(profesorId: string): Promise<Catedra[]> {
  const filas = await db
    .select({
      id: catedras.id,
      materiaId: catedras.materiaId,
      materiaNombre: materias.nombre,
      anio: materias.anio,
      division: catedras.division,
      profesorId: catedras.profesorId,
    })
    .from(catedras)
    .innerJoin(materias, eq(materias.id, catedras.materiaId))
    .where(eq(catedras.profesorId, profesorId))
    .orderBy(asc(materias.anio), asc(materias.nombre), asc(catedras.division))

  return filas
}

/** Las cátedras del usuario logueado. Solo tiene sentido para un profesor. */
export async function getMisCatedras(): Promise<Catedra[]> {
  const user = await requireUser()
  if (user.role !== "profesor") return []
  return listarCatedras(user.id)
}

/** Versión reducida que consume `lib/permisos.ts`. */
export async function getCatedrasScope(
  profesorId: string,
): Promise<CatedraScope[]> {
  const filas = await listarCatedras(profesorId)
  return filas.map((c) => ({
    materiaId: c.materiaId,
    anio: c.anio,
    division: c.division,
  }))
}

export async function listarMaterias() {
  await requireUser()
  return db
    .select({ id: materias.id, nombre: materias.nombre, anio: materias.anio })
    .from(materias)
    .orderBy(asc(materias.anio), asc(materias.nombre))
}

export async function listarUsuarios() {
  await requireRole("admin")
  return db
    .select({
      userId: perfiles.userId,
      nombre: perfiles.nombre,
      rol: perfiles.rol,
      anio: perfiles.anio,
      division: perfiles.division,
    })
    .from(perfiles)
    .orderBy(asc(perfiles.rol), asc(perfiles.nombre))
}

export async function asignarCatedra(input: {
  profesorId: string
  materiaId: string
  division: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin")

  if (!DIVISIONES.includes(input.division as (typeof DIVISIONES)[number])) {
    return { ok: false, error: "División inválida" }
  }

  // El destinatario tiene que existir y ser profesor: asignarle una cátedra a
  // un alumno le abriría las notas de todo el curso.
  const [destino] = await db
    .select({ rol: perfiles.rol })
    .from(perfiles)
    .where(eq(perfiles.userId, input.profesorId))
    .limit(1)

  if (!destino) return { ok: false, error: "El usuario no existe" }
  if (destino.rol !== "profesor") {
    return { ok: false, error: "Solo se pueden asignar cátedras a un profesor" }
  }

  const [materia] = await db
    .select({ id: materias.id })
    .from(materias)
    .where(eq(materias.id, input.materiaId))
    .limit(1)

  if (!materia) return { ok: false, error: "La materia no existe" }

  await db
    .insert(catedras)
    .values({
      profesorId: input.profesorId,
      materiaId: input.materiaId,
      division: input.division,
    })
    .onConflictDoNothing()

  return { ok: true }
}

export async function quitarCatedra(
  catedraId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole("admin")
  await db.delete(catedras).where(eq(catedras.id, catedraId))
  return { ok: true }
}
