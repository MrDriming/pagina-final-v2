/**
 * Tests de INTEGRACIÓN para lib/notas.ts.
 *
 * A diferencia de lib/grades.test.ts y lib/permisos.test.ts (unidad, sin
 * infraestructura), estos corren las funciones reales contra la base de
 * Postgres/Supabase, simulando sesiones de usuarios distintos con el
 * bypass de desarrollo. Son los que efectivamente verifican el scoping de
 * notas de alumnos menores de edad — que un profesor no vea ni pueda
 * escribir notas fuera de su cátedra.
 *
 * Requisitos para correrlos:
 *   1. `DATABASE_URL` configurada en `.env.local` (ya está en el repo).
 *   2. Los datos de scripts/seed-test-data.sql aplicados:
 *
 *        export PGPASSWORD="$(grep -oP '(?<=postgres:)[^@]+(?=@)' .env.local | head -1)"
 *        psql "$DATABASE_URL" -f scripts/seed-test-data.sql
 *
 * Si no hay DATABASE_URL en el entorno, el describe entero se saltea (ver
 * describe.skipIf más abajo) en vez de fallar con un error críptico de
 * conexión.
 *
 * Corré con: npm test -- lib/notas.test.ts
 *
 * IMPORTANTE: estos tests no pueden dejar residuo. guardarNota() escribe
 * de verdad. La limpieza vive en un afterEach INCONDICIONAL (ver más abajo)
 * que reescribe las 6 filas de `calificaciones` a sus valores base pase lo
 * que pase — no un "restaurar si el test hizo lo que esperaba". Los ids de
 * cátedra/materia se consultan en runtime (beforeAll), nunca se hardcodean,
 * porque son UUIDs generados al azar por el seed.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { calificaciones, catedras as catedrasTabla, materias } from "@/lib/db/schema"
import { comoUsuario } from "@/lib/test-support/as-user"

// guardarNota() llama revalidatePath("/notas") al final del camino feliz.
// Fuera de un request de Next.js no hay "static generation store", así que
// revalidatePath tira. Ese invariante no tiene nada que ver con lo que este
// archivo prueba (el scoping de notas), así que se mockea.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

const AGUIRRE = "11111111-1111-1111-1111-111111111111" // profesor, dicta Sistemas Digitales 4to A
const VEGA = "77777777-7777-7777-7777-777777777777" // profesor, sin cátedras
const BLANCO = "22222222-2222-2222-2222-222222222222" // 4to A
const NUNEZ = "33333333-3333-3333-3333-333333333333" // 4to A
const ENRIQUEZ = "44444444-4444-4444-4444-444444444444" // 4to A
const MORENO = "55555555-5555-5555-5555-555555555555" // 4to B
const CASTRO = "66666666-6666-6666-6666-666666666666" // 4to B

const CICLO_ACTUAL = new Date().getFullYear()
const ID_INEXISTENTE = "99999999-9999-9999-9999-999999999999"

describe.skipIf(!process.env.DATABASE_URL)("lib/notas.ts (integración)", () => {
  let sistemasDigitalesId: string
  let tallerId: string
  let catedraSistemasA: string

  // Estado base de las 6 filas de `calificaciones` del seed. `materiaId` se
  // completa recién en beforeAll (son UUIDs consultados en runtime), así
  // que arranca vacío y se llena antes de que corra ningún test.
  let calificacionesBase: {
    alumnoId: string
    materiaId: string
    t1: number
    t2: number
    t3: number
  }[] = []

  beforeAll(async () => {
    const [sistemas] = await db
      .select({ id: materias.id })
      .from(materias)
      .where(and(eq(materias.nombre, "Sistemas Digitales"), eq(materias.anio, "4to")))
    const [taller] = await db
      .select({ id: materias.id })
      .from(materias)
      .where(and(eq(materias.nombre, "Taller de Electromecánica"), eq(materias.anio, "4to")))

    if (!sistemas || !taller) {
      throw new Error(
        "Faltan materias del seed. Corré scripts/seed-test-data.sql antes de estos tests.",
      )
    }
    sistemasDigitalesId = sistemas.id
    tallerId = taller.id

    const [catedra] = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(
        and(
          eq(catedrasTabla.profesorId, AGUIRRE),
          eq(catedrasTabla.materiaId, sistemasDigitalesId),
          eq(catedrasTabla.division, "A"),
        ),
      )
    if (!catedra) {
      throw new Error(
        "Falta la cátedra de Aguirre. Corré scripts/seed-test-data.sql antes de estos tests.",
      )
    }
    catedraSistemasA = catedra.id

    calificacionesBase = [
      { alumnoId: BLANCO, materiaId: sistemasDigitalesId, t1: 7, t2: 8, t3: 9 },
      { alumnoId: BLANCO, materiaId: tallerId, t1: 6, t2: 7, t3: 7 },
      { alumnoId: NUNEZ, materiaId: sistemasDigitalesId, t1: 6, t2: 5, t3: 6 },
      { alumnoId: ENRIQUEZ, materiaId: sistemasDigitalesId, t1: 8, t2: 7, t3: 8 },
      { alumnoId: MORENO, materiaId: sistemasDigitalesId, t1: 9, t2: 9, t3: 10 },
      { alumnoId: CASTRO, materiaId: sistemasDigitalesId, t1: 7, t2: 8, t3: 7 },
    ]
  })

  /**
   * Limpieza INCONDICIONAL, corre después de CADA test sin importar si
   * pasó, falló, o qué asumió el test que había ocurrido.
   *
   * Por qué: un test negativo que solo "restaura si el código rechazó como
   * se esperaba" no limpia nada justo en el único caso que importa — cuando
   * el código bajo prueba está roto y el rechazo no ocurre. Se detectó así
   * en mutation testing: al sacar la validación de permisos de
   * asignarCatedra (en catedras.ts), la escritura se colaba y el test
   * fallaba al assertar, pero la fila quedaba en la base porque la limpieza
   * de ESE archivo estaba condicionada al resultado esperado. La lección
   * aplica igual acá: en vez de "si guardarNota tuvo éxito, restauro", este
   * afterEach reescribe SIEMPRE las 6 filas de calificaciones a su valor
   * base con UPDATEs explícitos. No lo cambies a una limpieza condicional
   * "para simplificar" — esa es justamente la versión que no protege nada.
   */
  afterEach(async () => {
    for (const fila of calificacionesBase) {
      await db
        .update(calificaciones)
        .set({ trimestre1: fila.t1, trimestre2: fila.t2, trimestre3: fila.t3 })
        .where(
          and(
            eq(calificaciones.alumnoId, fila.alumnoId),
            eq(calificaciones.materiaId, fila.materiaId),
            eq(calificaciones.cicloLectivo, CICLO_ACTUAL),
          ),
        )
    }
  })

  describe("getPlanilla", () => {
    it("devuelve exactamente los 3 alumnos de 4to A, con sus notas, y ningún alumno de 4to B", async () => {
      const { getPlanilla } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const planilla = await getPlanilla(catedraSistemasA)

      expect(planilla).not.toBeNull()
      expect(planilla!.catedra.id).toBe(catedraSistemasA)

      const porId = new Map(planilla!.filas.map((f) => [f.alumnoId, f]))

      // Los tres alumnos de la división que sí dicta, con sus notas reales.
      expect(porId.get(BLANCO)).toEqual({
        alumnoId: BLANCO,
        alumnoNombre: "Blanco, Facundo",
        t1: 7,
        t2: 8,
        t3: 9,
      })
      expect(porId.get(NUNEZ)).toEqual({
        alumnoId: NUNEZ,
        alumnoNombre: "Nuñez, Lautaro",
        t1: 6,
        t2: 5,
        t3: 6,
      })
      expect(porId.get(ENRIQUEZ)).toEqual({
        alumnoId: ENRIQUEZ,
        alumnoNombre: "Enriquez, Tomás",
        t1: 8,
        t2: 7,
        t3: 8,
      })

      // Moreno y Castro tienen nota en la MISMA materia, pero cursan 4to B:
      // no tienen que aparecer aunque la fila de calificaciones exista.
      expect(porId.has(MORENO)).toBe(false)
      expect(porId.has(CASTRO)).toBe(false)
      expect(planilla!.filas).toHaveLength(3)
    })

    it("devuelve null cuando la cátedra es de otro profesor", async () => {
      const { getPlanilla } = await comoUsuario(VEGA, () => import("@/lib/notas"))

      const planilla = await getPlanilla(catedraSistemasA)

      expect(planilla).toBeNull()
    })

    it("devuelve null cuando el id de cátedra no existe", async () => {
      const { getPlanilla } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const planilla = await getPlanilla(ID_INEXISTENTE)

      expect(planilla).toBeNull()
    })
  })

  describe("getNotasDeAlumno", () => {
    it("Blanco ve sus dos materias, y ninguna fila de otro alumno", async () => {
      const { getNotasDeAlumno } = await comoUsuario(BLANCO, () => import("@/lib/notas"))

      const filas = await getNotasDeAlumno()

      expect(filas).toHaveLength(2)
      const porMateria = new Map(filas.map((f) => [f.materia, f]))

      expect(porMateria.get("Sistemas Digitales")).toMatchObject({
        t1: 7,
        t2: 8,
        t3: 9,
      })
      expect(porMateria.get("Taller de Electromecánica")).toMatchObject({
        t1: 6,
        t2: 7,
        t3: 7,
      })

      // Todas las filas devueltas son de Blanco: getNotasDeAlumno no recibe
      // un id, así que si esto fallara sería porque el WHERE se rompió y
      // trajo notas de todo el curso.
      const notasCrudas = await db
        .select({ alumnoId: calificaciones.alumnoId })
        .from(calificaciones)
        .where(
          and(
            eq(calificaciones.cicloLectivo, CICLO_ACTUAL),
            eq(calificaciones.alumnoId, BLANCO),
          ),
        )
      expect(filas.length).toBe(notasCrudas.length)
    })
  })

  describe("guardarNota", () => {
    it("rechaza escribir en una materia que el profesor no dicta, y no toca la base", async () => {
      const { guardarNota } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const resultado = await guardarNota({
        alumnoId: BLANCO,
        materiaId: tallerId, // Aguirre dicta Sistemas Digitales, no el Taller
        t1: 1,
        t2: 1,
        t3: 1,
      })

      expect(resultado.ok).toBe(false)

      const [fila] = await db
        .select({
          t1: calificaciones.trimestre1,
          t2: calificaciones.trimestre2,
          t3: calificaciones.trimestre3,
        })
        .from(calificaciones)
        .where(
          and(
            eq(calificaciones.alumnoId, BLANCO),
            eq(calificaciones.materiaId, tallerId),
            eq(calificaciones.cicloLectivo, CICLO_ACTUAL),
          ),
        )
      expect(fila).toEqual({ t1: 6, t2: 7, t3: 7 })
    })

    it("rechaza una nota fuera de rango", async () => {
      const { guardarNota } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const resultado = await guardarNota({
        alumnoId: NUNEZ,
        materiaId: sistemasDigitalesId, // esta sí la dicta Aguirre
        t1: 11, // fuera de rango: 1-10
        t2: 5,
        t3: 6,
      })

      expect(resultado.ok).toBe(false)

      const [fila] = await db
        .select({ t1: calificaciones.trimestre1 })
        .from(calificaciones)
        .where(
          and(
            eq(calificaciones.alumnoId, NUNEZ),
            eq(calificaciones.materiaId, sistemasDigitalesId),
            eq(calificaciones.cicloLectivo, CICLO_ACTUAL),
          ),
        )
      expect(fila.t1).toBe(6)
    })

    it("el camino feliz guarda la nota en su propia cátedra", async () => {
      const { guardarNota } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const resultado = await guardarNota({
        alumnoId: NUNEZ,
        materiaId: sistemasDigitalesId,
        t1: 10,
        t2: 5,
        t3: 6,
      })

      expect(resultado).toEqual({ ok: true })

      const [fila] = await db
        .select({
          t1: calificaciones.trimestre1,
          t2: calificaciones.trimestre2,
          t3: calificaciones.trimestre3,
        })
        .from(calificaciones)
        .where(
          and(
            eq(calificaciones.alumnoId, NUNEZ),
            eq(calificaciones.materiaId, sistemasDigitalesId),
            eq(calificaciones.cicloLectivo, CICLO_ACTUAL),
          ),
        )
      expect(fila).toEqual({ t1: 10, t2: 5, t3: 6 })

      // No hace falta restaurar acá: el afterEach incondicional de arriba
      // reescribe las 6 filas base después de este test (y de cualquier
      // otro), pase lo que pase.
    })
  })

  describe("getNotasParaAdmin", () => {
    it("devuelve [] cuando lo llama un profesor", async () => {
      const { getNotasParaAdmin } = await comoUsuario(AGUIRRE, () => import("@/lib/notas"))

      const filas = await getNotasParaAdmin()

      expect(filas).toEqual([])
    })
  })
})
