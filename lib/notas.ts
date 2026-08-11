import "server-only"

import { and, eq, asc, inArray, type SQL } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { calificaciones, materias, perfiles } from "@/lib/db/schema"
import { requireUser } from "@/lib/session"
import { puedeEditarNota } from "@/lib/permisos"
import { validarNota } from "@/lib/grades"
import { getCatedrasScope, listarCatedras, type Catedra } from "@/lib/catedras"
import { registrar } from "@/lib/auditoria"
import { notificar } from "@/lib/notificaciones"

export interface FilaNotaAlumno {
  materiaId: string
  materia: string
  anio: string
  t1: number | null
  t2: number | null
  t3: number | null
}

export interface FilaPlanilla {
  alumnoId: string
  alumnoNombre: string
  t1: number | null
  t2: number | null
  t3: number | null
}

export interface Planilla {
  catedra: Catedra
  filas: FilaPlanilla[]
}

export interface FilaAdmin {
  alumnoId: string
  alumnoNombre: string
  anio: string | null
  division: string | null
  materia: string
  t1: number | null
  t2: number | null
  t3: number | null
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esUuid(valor: string): boolean {
  return UUID_RE.test(valor)
}

/** El ciclo lo decide el servidor. Si viniera del form, se podrían cargar
 *  notas en un ciclo ya cerrado. */
export function cicloActual(): number {
  return new Date().getFullYear()
}

/** Las notas del alumno logueado. No recibe id: siempre es él mismo. */
export async function getNotasDeAlumno(): Promise<FilaNotaAlumno[]> {
  const user = await requireUser()

  return db
    .select({
      materiaId: materias.id,
      materia: materias.nombre,
      anio: materias.anio,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .innerJoin(materias, eq(materias.id, calificaciones.materiaId))
    .where(
      and(
        eq(calificaciones.alumnoId, user.id),
        eq(calificaciones.cicloLectivo, cicloActual()),
      ),
    )
    .orderBy(asc(materias.nombre))
}

/**
 * La planilla de una cátedra: los alumnos de ese curso con sus notas en esa
 * materia. Devuelve null si la cátedra no existe o no es del que llama.
 */
export async function getPlanilla(catedraId: string): Promise<Planilla | null> {
  const user = await requireUser()
  if (user.role !== "profesor") return null

  const mias = await listarCatedras(user.id)
  const catedra = mias.find((c) => c.id === catedraId)
  if (!catedra) return null

  const alumnos = await db
    .select({ id: perfiles.userId, nombre: perfiles.nombre })
    .from(perfiles)
    .where(
      and(
        eq(perfiles.rol, "alumno"),
        eq(perfiles.anio, catedra.anio),
        eq(perfiles.division, catedra.division),
      ),
    )
    .orderBy(asc(perfiles.nombre))

  // Si el curso no tiene alumnos, no hay nada que buscar. Además `inArray`
  // con una lista vacía es un caso borde que conviene no pisar.
  if (alumnos.length === 0) {
    return { catedra, filas: [] }
  }

  const notas = await db
    .select({
      alumnoId: calificaciones.alumnoId,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .where(
      and(
        eq(calificaciones.materiaId, catedra.materiaId),
        eq(calificaciones.cicloLectivo, cicloActual()),
        // Acotado al curso: la base no devuelve notas de otras divisiones,
        // en vez de confiar en que después las filtremos en memoria.
        inArray(
          calificaciones.alumnoId,
          alumnos.map((a) => a.id),
        ),
      ),
    )

  const porAlumno = new Map(notas.map((n) => [n.alumnoId, n]))

  return {
    catedra,
    filas: alumnos.map((a) => {
      const n = porAlumno.get(a.id)
      return {
        alumnoId: a.id,
        alumnoNombre: a.nombre,
        t1: n?.t1 ?? null,
        t2: n?.t2 ?? null,
        t3: n?.t3 ?? null,
      }
    }),
  }
}

export async function getNotasParaAdmin(filtros?: {
  anio?: string
  division?: string
  materiaId?: string
}): Promise<FilaAdmin[]> {
  const user = await requireUser()
  if (user.role !== "admin") return []

  // Un materiaId con formato inválido devuelve vacío, no se ignora el filtro:
  // ignorarlo mostraría MÁS filas de las pedidas, que es falla abierta.
  if (filtros?.materiaId && !esUuid(filtros.materiaId)) {
    return []
  }

  const condiciones: SQL[] = [eq(calificaciones.cicloLectivo, cicloActual())]
  if (filtros?.anio) condiciones.push(eq(perfiles.anio, filtros.anio))
  if (filtros?.division) condiciones.push(eq(perfiles.division, filtros.division))
  if (filtros?.materiaId) condiciones.push(eq(materias.id, filtros.materiaId))

  return db
    .select({
      alumnoId: perfiles.userId,
      alumnoNombre: perfiles.nombre,
      anio: perfiles.anio,
      division: perfiles.division,
      materia: materias.nombre,
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .innerJoin(materias, eq(materias.id, calificaciones.materiaId))
    .innerJoin(perfiles, eq(perfiles.userId, calificaciones.alumnoId))
    .where(and(...condiciones))
    .orderBy(asc(perfiles.nombre), asc(materias.nombre))
}

/**
 * Guarda los tres trimestres de un alumno en una materia.
 *
 * NO confía en el formulario: el `alumnoId` y el `materiaId` que llegan se
 * usan para volver a consultar las cátedras del profesor y decidir de cero.
 * Sin esto, alcanza con editar el HTML para cargar notas en una materia ajena.
 */
export async function guardarNota(input: {
  alumnoId: string
  materiaId: string
  t1: unknown
  t2: unknown
  t3: unknown
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser()

  if (!esUuid(input.alumnoId) || !esUuid(input.materiaId)) {
    return { ok: false, error: "Identificador inválido" }
  }

  const [alumno] = await db
    .select({
      id: perfiles.userId,
      nombre: perfiles.nombre,
      anio: perfiles.anio,
      division: perfiles.division,
      rol: perfiles.rol,
    })
    .from(perfiles)
    .where(eq(perfiles.userId, input.alumnoId))
    .limit(1)

  if (!alumno || alumno.rol !== "alumno") {
    return { ok: false, error: "Alumno inexistente" }
  }

  const scope = await getCatedrasScope(user.id)

  if (!puedeEditarNota(user, alumno, input.materiaId, scope)) {
    // No es un error de usuario: o es un bug, o alguien tocó el formulario.
    console.error(
      `[permisos] ${user.id} (${user.role}) intentó escribir la nota de ` +
        `${input.alumnoId} en la materia ${input.materiaId} sin cátedra`,
    )
    return { ok: false, error: "No tenés permiso para editar esta nota" }
  }

  const validadas = [input.t1, input.t2, input.t3].map(validarNota)
  const invalida = validadas.find((v) => !v.ok)
  if (invalida && !invalida.ok) {
    return { ok: false, error: invalida.error }
  }

  const [t1, t2, t3] = validadas.map((v) => (v.ok ? v.valor : null))

  // Los valores que había antes, para que la auditoría pueda mostrar de qué a
  // qué cambió cada trimestre. Es el dato que se pide cuando alguien reclama
  // una nota.
  const [previa] = await db
    .select({
      t1: calificaciones.trimestre1,
      t2: calificaciones.trimestre2,
      t3: calificaciones.trimestre3,
    })
    .from(calificaciones)
    .where(
      and(
        eq(calificaciones.alumnoId, input.alumnoId),
        eq(calificaciones.materiaId, input.materiaId),
        eq(calificaciones.cicloLectivo, cicloActual()),
      ),
    )
    .limit(1)

  const [materia] = await db
    .select({ nombre: materias.nombre })
    .from(materias)
    .where(eq(materias.id, input.materiaId))
    .limit(1)

  const antes = { t1: previa?.t1 ?? null, t2: previa?.t2 ?? null, t3: previa?.t3 ?? null }
  const ahora = { t1, t2, t3 }
  const huboCambio =
    antes.t1 !== ahora.t1 || antes.t2 !== ahora.t2 || antes.t3 !== ahora.t3

  await db.transaction(async (tx) => {
    await tx
      .insert(calificaciones)
      .values({
        alumnoId: input.alumnoId,
        materiaId: input.materiaId,
        cicloLectivo: cicloActual(),
        trimestre1: t1,
        trimestre2: t2,
        trimestre3: t3,
        actualizadoPor: user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          calificaciones.alumnoId,
          calificaciones.materiaId,
          calificaciones.cicloLectivo,
        ],
        set: {
          trimestre1: t1,
          trimestre2: t2,
          trimestre3: t3,
          actualizadoPor: user.id,
          updatedAt: new Date(),
        },
      })

    // Guardar la planilla sin tocar nada es lo más común (el profesor manda
    // el formulario entero aunque haya editado una sola fila). Auditar eso
    // llenaría el registro de ruido y taparía los cambios de verdad.
    if (!huboCambio) return

    await registrar(
      user,
      {
        accion: "nota.guardar",
        entidad: "calificacion",
        entidadId: `${input.alumnoId}:${input.materiaId}`,
        detalle: {
          alumno: alumno.nombre,
          materia: materia?.nombre ?? input.materiaId,
          ciclo: cicloActual(),
          antes,
          ahora,
        },
      },
      tx,
    )

    await notificar(
      [
        {
          userId: input.alumnoId,
          tipo: "nota",
          titulo: `Nueva nota en ${materia?.nombre ?? "una materia"}`,
          cuerpo: `${user.name} actualizó tus notas: ${describirTrimestres(ahora)}.`,
          link: "/notas",
        },
      ],
      tx,
    )
  })

  revalidatePath("/notas")
  return { ok: true }
}

function describirTrimestres(n: {
  t1: number | null
  t2: number | null
  t3: number | null
}): string {
  return [n.t1, n.t2, n.t3]
    .map((v, i) => `${i + 1}º ${v ?? "—"}`)
    .join(", ")
}
