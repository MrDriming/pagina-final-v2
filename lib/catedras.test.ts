/**
 * Tests de INTEGRACIÓN para lib/catedras.ts.
 *
 * Igual que lib/notas.test.ts: corren las funciones reales contra la base
 * de Postgres/Supabase, simulando sesiones de usuarios distintos con el
 * bypass de desarrollo (ver lib/test-support/as-user.ts). Cubren quién
 * puede administrar cátedras — asignarlas y quitarlas es lo que decide,
 * indirectamente, quién puede ver y editar notas de alumnos.
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
 * Corré con: npm test -- lib/catedras.test.ts
 *
 * Todos estos tests esperan que asignarCatedra/quitarCatedra RECHACEN. En
 * el código correcto no llegan a tocar la tabla `catedras`. Pero el mismo
 * argumento que justifica el afterEach incondicional de lib/notas.test.ts
 * aplica acá, y no es hipotético: se detectó en mutation testing real. Al
 * sacarle `await requireRole("admin")` a asignarCatedra, la escritura para
 * Vega SÍ se coló (se creó una cátedra "Sistemas Digitales división B" que
 * antes no existía) y el test falló recién al assertar el resultado — la
 * fila quedó en la base, porque en esa primera versión la limpieza asumía
 * que "si el test espera un rechazo, no hay nada que restaurar". Esa
 * suposición es exactamente la que falla en el único momento que importa:
 * cuando el código bajo prueba está roto.
 *
 * Por eso la limpieza de acá NO pregunta qué se esperaba: en cada afterEach
 * se borra cualquier cátedra de Vega, se borra cualquier cátedra de Aguirre
 * que no sea "Sistemas Digitales, división A", y se reinserta esa cátedra
 * base si un mutante en quitarCatedra la llegó a borrar. No lo cambies a
 * una limpieza condicional "para simplificar" — esa es la versión que no
 * protege nada.
 *
 * El mismo argumento aplica a cambiarRol/asignarCurso: el afterEach también
 * restaura INCONDICIONALMENTE el rol de Vega a "profesor" (por si un test de
 * degradación lo dejó en "alumno") y limpia/restaura el curso de Blanco por
 * si algún test de asignarCurso lo llegó a tocar.
 *
 * IMPORTANTE — los tests que degradan un rol usan a VEGA como sujeto, NUNCA
 * a Aguirre. lib/notas.test.ts (otro archivo) asume que Aguirre sigue
 * siendo profesor con su cátedra de Sistemas Digitales división A durante
 * toda la corrida. Vitest corre archivos de test en paralelo por default —
 * este repo lo desactiva con `fileParallelism: false` en vitest.config.ts,
 * pero aun así, mutar a Aguirre acá sería frágil: un afterEach que no
 * llegue a correr (timeout, throw) dejaría a Aguirre roto para el otro
 * archivo. Vega es profesora, no tiene cátedras propias y nada fuera de
 * este archivo depende de su estado.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { and, eq, ne, notInArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { catedras as catedrasTabla, materias, perfiles } from "@/lib/db/schema"
import { comoUsuario } from "@/lib/test-support/as-user"

const AGUIRRE = "11111111-1111-1111-1111-111111111111" // profesor
const VEGA = "77777777-7777-7777-7777-777777777777" // profesor, sin cátedras
const BLANCO = "22222222-2222-2222-2222-222222222222" // alumno, 4to A

describe.skipIf(!process.env.DATABASE_URL)("lib/catedras.ts (integración)", () => {
  let sistemasDigitalesId: string

  beforeAll(async () => {
    const [sistemas] = await db
      .select({ id: materias.id })
      .from(materias)
      .where(and(eq(materias.nombre, "Sistemas Digitales"), eq(materias.anio, "4to")))
    if (!sistemas) {
      throw new Error("Falta la materia del seed. Corré scripts/seed-test-data.sql.")
    }
    sistemasDigitalesId = sistemas.id
  })

  // Limpieza INCONDICIONAL — ver el comentario largo al principio del
  // archivo para la razón (mutation testing real, no un "por las dudas").
  afterEach(async () => {
    // Restaurá el rol de Vega ANTES de tocar cátedras: si quedó con un rol
    // distinto por un test roto, cualquier limpieza de sus cátedras de acá
    // abajo tiene que seguir aplicando igual.
    await db
      .update(perfiles)
      .set({ rol: "profesor" })
      .where(eq(perfiles.userId, VEGA))

    await db.delete(catedrasTabla).where(eq(catedrasTabla.profesorId, VEGA))

    await db
      .delete(catedrasTabla)
      .where(
        and(
          eq(catedrasTabla.profesorId, AGUIRRE),
          notInArray(catedrasTabla.materiaId, [sistemasDigitalesId]),
        ),
      )
    await db
      .delete(catedrasTabla)
      .where(and(eq(catedrasTabla.profesorId, AGUIRRE), ne(catedrasTabla.division, "A")))

    await db
      .insert(catedrasTabla)
      .values({ profesorId: AGUIRRE, materiaId: sistemasDigitalesId, division: "A" })
      .onConflictDoNothing()

    // Restaurá el curso de Blanco (4to A) por si un test de asignarCurso lo
    // tocó.
    await db
      .update(perfiles)
      .set({ anio: "4to", division: "A" })
      .where(eq(perfiles.userId, BLANCO))
  })

  it("asignarCatedra rechaza si lo llama un profesor (no admin)", async () => {
    const { asignarCatedra } = await comoUsuario(AGUIRRE, () => import("@/lib/catedras"))

    await expect(
      asignarCatedra({ profesorId: VEGA, materiaId: sistemasDigitalesId, division: "B" }),
    ).rejects.toThrow(/permiso/i)

    // No tiene que haber quedado ninguna cátedra para Vega: si el rechazo
    // no fuera real, esto la agarraría aunque el `rejects.toThrow` de
    // arriba, por algún motivo, no lo hiciera.
    const filas = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(eq(catedrasTabla.profesorId, VEGA))
    expect(filas).toHaveLength(0)
  })

  it("asignarCatedra rechaza asignarle una cátedra a un alumno, aun llamada por un admin", async () => {
    // Sin DEV_BYPASS_USER_ID cae en el usuario de desarrollo con el rol de
    // DEV_BYPASS_ROLE (admin en .env.local).
    const { asignarCatedra } = await comoUsuario(null, () => import("@/lib/catedras"))

    const resultado = await asignarCatedra({
      profesorId: BLANCO, // Blanco es alumno, no profesor
      materiaId: sistemasDigitalesId,
      division: "A",
    })

    expect(resultado).toEqual({
      ok: false,
      error: "Solo se pueden asignar cátedras a un profesor",
    })

    // No debe haber quedado ninguna cátedra con a Blanco de "profesor".
    const filas = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(eq(catedrasTabla.profesorId, BLANCO))
    expect(filas).toHaveLength(0)
  })

  it("quitarCatedra rechaza si lo llama un profesor", async () => {
    const { quitarCatedra } = await comoUsuario(AGUIRRE, () => import("@/lib/catedras"))

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
      throw new Error("Falta la cátedra del seed. Corré scripts/seed-test-data.sql.")
    }

    await expect(quitarCatedra(catedra.id)).rejects.toThrow(/permiso/i)

    // Ni un profesor rechazado debería haber podido borrar la cátedra.
    const [siguesAhi] = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(eq(catedrasTabla.id, catedra.id))
    expect(siguesAhi).toBeDefined()
  })

  it("listarCatedras rechaza si un profesor pide las cátedras de otro profesor", async () => {
    const { listarCatedras } = await comoUsuario(VEGA, () => import("@/lib/catedras"))

    await expect(listarCatedras(AGUIRRE)).rejects.toThrow(/permiso/i)
  })

  it("cambiarRol rechaza si lo llama un profesor", async () => {
    const { cambiarRol } = await comoUsuario(AGUIRRE, () => import("@/lib/catedras"))

    await expect(cambiarRol({ userId: VEGA, rol: "admin" })).rejects.toThrow(/permiso/i)

    const [vega] = await db
      .select({ rol: perfiles.rol })
      .from(perfiles)
      .where(eq(perfiles.userId, VEGA))
    expect(vega?.rol).toBe("profesor")
  })

  it("cambiarRol rechaza que un admin se cambie el rol a sí mismo", async () => {
    const { cambiarRol } = await comoUsuario(null, () => import("@/lib/catedras"))
    const adminId = "00000000-0000-0000-0000-000000000000"

    const resultado = await cambiarRol({ userId: adminId, rol: "alumno" })

    expect(resultado).toEqual({ ok: false, error: "No podés cambiar tu propio rol" })
  })

  it("cambiarRol rechaza un rol inválido", async () => {
    const { cambiarRol } = await comoUsuario(null, () => import("@/lib/catedras"))

    const resultado = await cambiarRol({ userId: VEGA, rol: "superadmin" })

    expect(resultado).toEqual({ ok: false, error: "Rol inválido" })

    const [vega] = await db
      .select({ rol: perfiles.rol })
      .from(perfiles)
      .where(eq(perfiles.userId, VEGA))
    expect(vega?.rol).toBe("profesor")
  })

  it("al degradar un profesor a alumno, sus cátedras desaparecen", async () => {
    // Sujeto: Vega, no Aguirre. Ver el comentario al principio del archivo:
    // Aguirre y su cátedra los usa lib/notas.test.ts en paralelo, así que el
    // test es autocontenido y se asigna su propia cátedra acá.
    await db
      .insert(catedrasTabla)
      .values({ profesorId: VEGA, materiaId: sistemasDigitalesId, division: "B" })
      .onConflictDoNothing()

    const antes = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(eq(catedrasTabla.profesorId, VEGA))
    expect(antes.length).toBeGreaterThan(0)

    const { cambiarRol } = await comoUsuario(null, () => import("@/lib/catedras"))
    const resultado = await cambiarRol({ userId: VEGA, rol: "alumno" })
    expect(resultado).toEqual({ ok: true })

    const [perfil] = await db
      .select({ rol: perfiles.rol })
      .from(perfiles)
      .where(eq(perfiles.userId, VEGA))
    expect(perfil?.rol).toBe("alumno")

    // Efecto crítico: sin cátedras, no queda acceso a las notas del curso.
    const despues = await db
      .select({ id: catedrasTabla.id })
      .from(catedrasTabla)
      .where(eq(catedrasTabla.profesorId, VEGA))
    expect(despues).toHaveLength(0)
  })

  it("asignarCurso rechaza si lo llama un profesor", async () => {
    const { asignarCurso } = await comoUsuario(AGUIRRE, () => import("@/lib/catedras"))

    await expect(
      asignarCurso({ userId: BLANCO, anio: "5to", division: "B" }),
    ).rejects.toThrow(/permiso/i)

    const [blanco] = await db
      .select({ anio: perfiles.anio, division: perfiles.division })
      .from(perfiles)
      .where(eq(perfiles.userId, BLANCO))
    expect(blanco).toEqual({ anio: "4to", division: "A" })
  })

  it("asignarCurso rechaza un año que no está en las constantes", async () => {
    const { asignarCurso } = await comoUsuario(null, () => import("@/lib/catedras"))

    const resultado = await asignarCurso({ userId: BLANCO, anio: "7mo", division: "A" })

    expect(resultado).toEqual({ ok: false, error: "Año inválido" })
  })

  it("asignarCurso rechaza una división que no está en las constantes", async () => {
    const { asignarCurso } = await comoUsuario(null, () => import("@/lib/catedras"))

    const resultado = await asignarCurso({ userId: BLANCO, anio: "4to", division: "Z" })

    expect(resultado).toEqual({ ok: false, error: "División inválida" })
  })

  it("asignarCurso rechaza asignarle curso a un profesor", async () => {
    const { asignarCurso } = await comoUsuario(null, () => import("@/lib/catedras"))

    const resultado = await asignarCurso({ userId: AGUIRRE, anio: "4to", division: "A" })

    expect(resultado).toEqual({ ok: false, error: "Solo se puede asignar curso a un alumno" })
  })
})
