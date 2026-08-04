import type { Role } from "@/lib/session"

/**
 * La regla de permisos sobre notas, en un solo lugar.
 *
 * Este módulo es PURO: no consulta la base y no importa "server-only". Las
 * cátedras del profesor llegan como argumento. Así se puede testear sin
 * infraestructura, y hay un único archivo que leer cuando alguien pregunta
 * "¿quién puede ver esta nota?".
 */

/** Una cátedra reducida a lo que hace falta para decidir. */
export interface CatedraScope {
  materiaId: string
  anio: string
  division: string
}

/** El alumno dueño de la nota, con su curso. */
export interface AlumnoUbicado {
  id: string
  anio: string | null
  division: string | null
}

/** Quien pide, con el rol ya resuelto del lado del servidor. */
export interface Actor {
  id: string
  role: Role
}

function dictaEsaMateriaEnEseCurso(
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  // Un alumno sin curso asignado no cae bajo ninguna cátedra.
  if (!alumno.anio || !alumno.division) return false

  return catedras.some(
    (c) =>
      c.materiaId === materiaId &&
      c.anio === alumno.anio &&
      c.division === alumno.division,
  )
}

export function puedeVerNota(
  actor: Actor,
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  if (actor.role === "admin") return true
  if (actor.role === "alumno") return actor.id === alumno.id
  if (actor.role === "profesor") {
    return dictaEsaMateriaEnEseCurso(alumno, materiaId, catedras)
  }
  return false
}

export function puedeEditarNota(
  actor: Actor,
  alumno: AlumnoUbicado,
  materiaId: string,
  catedras: CatedraScope[],
): boolean {
  // El admin audita, no carga notas. El alumno tampoco, obviamente.
  if (actor.role !== "profesor") return false
  return dictaEsaMateriaEnEseCurso(alumno, materiaId, catedras)
}
