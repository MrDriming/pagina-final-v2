import "server-only"

import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { catedras, materias, perfiles } from "@/lib/db/schema"
import { requireUser, requireRole, type Role } from "@/lib/session"
import type { CatedraScope } from "@/lib/permisos"
import { ANIOS, DIVISIONES } from "@/lib/grades"
import { registrar } from "@/lib/auditoria"
import { notificar } from "@/lib/notificaciones"

export interface Catedra {
  id: string
  materiaId: string
  materiaNombre: string
  anio: string
  division: string
  profesorId: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esUuid(valor: string): boolean {
  return UUID_RE.test(valor)
}

/** Cátedras de un profesor, con el nombre y el año de la materia resueltos. */
export async function listarCatedras(profesorId: string): Promise<Catedra[]> {
  // Nadie mira las cátedras de otro salvo un admin. `db` saltea RLS, así que
  // este chequeo es la única defensa.
  const user = await requireUser()
  if (user.id !== profesorId && user.role !== "admin") {
    throw new Error("No tenés permiso para ver estas cátedras")
  }

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
  const admin = await requireRole("admin")

  if (!DIVISIONES.includes(input.division as (typeof DIVISIONES)[number])) {
    return { ok: false, error: "División inválida" }
  }

  if (!esUuid(input.profesorId) || !esUuid(input.materiaId)) {
    return { ok: false, error: "Identificador inválido" }
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
    .select({ id: materias.id, nombre: materias.nombre, anio: materias.anio })
    .from(materias)
    .where(eq(materias.id, input.materiaId))
    .limit(1)

  if (!materia) return { ok: false, error: "La materia no existe" }

  await db.transaction(async (tx) => {
    const creadas = await tx
      .insert(catedras)
      .values({
        profesorId: input.profesorId,
        materiaId: input.materiaId,
        division: input.division,
      })
      .onConflictDoNothing()
      .returning({ id: catedras.id })

    // Si ya la tenía, `onConflictDoNothing` no inserta nada. No es un error,
    // pero tampoco pasó nada que auditar ni que avisar.
    const catedra = creadas[0]
    if (!catedra) return

    const curso = `${materia.anio} ${input.division}`

    await registrar(
      admin,
      {
        accion: "catedra.asignar",
        entidad: "catedra",
        entidadId: catedra.id,
        detalle: {
          profesorId: input.profesorId,
          materia: materia.nombre,
          curso,
        },
      },
      tx,
    )

    await notificar(
      [
        {
          userId: input.profesorId,
          tipo: "catedra",
          titulo: "Te asignaron una cátedra",
          cuerpo: `${materia.nombre} — ${curso}. Ya podés cargar notas.`,
          link: "/catedras",
        },
      ],
      tx,
    )
  })

  return { ok: true }
}

export async function quitarCatedra(
  catedraId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireRole("admin")

  if (!esUuid(catedraId)) {
    return { ok: false, error: "Identificador inválido" }
  }

  // Se lee antes de borrar: después ya no hay de dónde sacar de qué materia
  // y de qué curso era.
  const [previa] = await db
    .select({
      profesorId: catedras.profesorId,
      division: catedras.division,
      materiaNombre: materias.nombre,
      anio: materias.anio,
    })
    .from(catedras)
    .innerJoin(materias, eq(materias.id, catedras.materiaId))
    .where(eq(catedras.id, catedraId))
    .limit(1)

  // Borrar algo que no existe no es un error para el que llama, pero no hay
  // nada que auditar.
  if (!previa) return { ok: true }

  const curso = `${previa.anio} ${previa.division}`

  await db.transaction(async (tx) => {
    await tx.delete(catedras).where(eq(catedras.id, catedraId))

    await registrar(
      admin,
      {
        accion: "catedra.quitar",
        entidad: "catedra",
        entidadId: catedraId,
        detalle: {
          profesorId: previa.profesorId,
          materia: previa.materiaNombre,
          curso,
        },
      },
      tx,
    )

    await notificar(
      [
        {
          userId: previa.profesorId,
          tipo: "catedra",
          titulo: "Te quitaron una cátedra",
          cuerpo: `${previa.materiaNombre} — ${curso}. Ya no podés cargar notas de ese curso.`,
          link: "/catedras",
        },
      ],
      tx,
    )
  })

  return { ok: true }
}

const ROLES_VALIDOS: Role[] = ["alumno", "profesor", "admin"]

/**
 * Cambia el rol de un usuario. Es la única forma de crear un profesor o un
 * admin: el signup público solo crea alumnos (ver `lib/session.ts` y el
 * comentario en el README sobre el bootstrap del primer admin).
 */
export async function cambiarRol(input: {
  userId: string
  rol: string
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireRole("admin")

  if (!esUuid(input.userId)) {
    return { ok: false, error: "Identificador inválido" }
  }

  if (!ROLES_VALIDOS.includes(input.rol as Role)) {
    return { ok: false, error: "Rol inválido" }
  }

  // Un admin no puede tocar su propio rol. Si el único admin se degrada,
  // nadie puede volver a entrar a /usuarios: el sistema queda sin
  // administración y sin forma de arreglarlo desde la app.
  if (input.userId === admin.id) {
    return { ok: false, error: "No podés cambiar tu propio rol" }
  }

  const [destino] = await db
    .select({ userId: perfiles.userId, rol: perfiles.rol })
    .from(perfiles)
    .where(eq(perfiles.userId, input.userId))
    .limit(1)

  if (!destino) return { ok: false, error: "El usuario no existe" }

  const rolNuevo = input.rol as Role

  await db.transaction(async (tx) => {
    await tx
      .update(perfiles)
      .set({ rol: rolNuevo })
      .where(eq(perfiles.userId, input.userId))

    // Si deja de ser profesor, sus cátedras se borran: si no, quedan filas
    // de `catedras` apuntando a alguien que ya no dicta, y `getPlanilla`
    // le seguiría dando acceso a notas de alumnos.
    if (rolNuevo !== "profesor") {
      await tx.delete(catedras).where(eq(catedras.profesorId, input.userId))
    }

    await registrar(
      admin,
      {
        accion: "usuario.rol",
        entidad: "perfil",
        entidadId: input.userId,
        detalle: { rolAnterior: destino.rol, rolNuevo },
      },
      tx,
    )

    await notificar(
      [
        {
          userId: input.userId,
          tipo: "rol",
          titulo: "Cambió tu rol en el campus",
          cuerpo: `Pasaste de ${destino.rol} a ${rolNuevo}.`,
          link: "/",
        },
      ],
      tx,
    )
  })

  return { ok: true }
}

/**
 * Asigna (o limpia) el año y la división de un alumno. Un profesor no tiene
 * curso propio: sus alumnos salen de sus cátedras, no de su perfil.
 */
export async function asignarCurso(input: {
  userId: string
  anio: string | null
  division: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireRole("admin")

  if (!esUuid(input.userId)) {
    return { ok: false, error: "Identificador inválido" }
  }

  if (
    input.anio !== null &&
    !ANIOS.includes(input.anio as (typeof ANIOS)[number])
  ) {
    return { ok: false, error: "Año inválido" }
  }

  if (
    input.division !== null &&
    !DIVISIONES.includes(input.division as (typeof DIVISIONES)[number])
  ) {
    return { ok: false, error: "División inválida" }
  }

  const [destino] = await db
    .select({
      rol: perfiles.rol,
      anio: perfiles.anio,
      division: perfiles.division,
    })
    .from(perfiles)
    .where(eq(perfiles.userId, input.userId))
    .limit(1)

  if (!destino) return { ok: false, error: "El usuario no existe" }
  if (destino.rol !== "alumno") {
    return { ok: false, error: "Solo se puede asignar curso a un alumno" }
  }

  const cursoAnterior = describirCurso(destino.anio, destino.division)
  const cursoNuevo = describirCurso(input.anio, input.division)

  await db.transaction(async (tx) => {
    await tx
      .update(perfiles)
      .set({ anio: input.anio, division: input.division })
      .where(eq(perfiles.userId, input.userId))

    await registrar(
      admin,
      {
        accion: "usuario.curso",
        entidad: "perfil",
        entidadId: input.userId,
        detalle: { cursoAnterior, cursoNuevo },
      },
      tx,
    )

    await notificar(
      [
        {
          userId: input.userId,
          tipo: "curso",
          titulo: "Cambió tu curso",
          cuerpo: `Pasaste de ${cursoAnterior} a ${cursoNuevo}.`,
          link: "/notas",
        },
      ],
      tx,
    )
  })

  return { ok: true }
}

function describirCurso(anio: string | null, division: string | null): string {
  if (!anio && !division) return "sin curso"
  return `${anio ?? "?"} ${division ?? "?"}`
}
