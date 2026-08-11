/**
 * Tests de INTEGRACIÓN para lib/auditoria.ts y lib/notificaciones.ts.
 *
 * Mismo esquema que lib/catedras.test.ts: corren las funciones reales contra
 * la base, simulando sesiones con el bypass de desarrollo (ver
 * lib/test-support/as-user.ts). Requisitos idénticos: `DATABASE_URL` en
 * `.env.local` y los datos de scripts/seed-test-data.sql aplicados.
 *
 * Lo que se cubre es lo que puede fallar en silencio:
 *
 *  - Que la auditoría se escriba de verdad cuando una acción muta algo. Es
 *    fácil que alguien saque el `registrar` de una transacción al refactorizar
 *    y nadie se entere hasta que haga falta el registro.
 *  - Que NADIE sin rol admin pueda leerla.
 *  - Que marcar una notificación como leída no funcione sobre la de otro. El
 *    UPDATE está acotado por `userId` en el WHERE; si alguien lo saca, el id
 *    de una notificación ajena alcanzaría.
 *
 * Igual que en catedras.test.ts, la limpieza del afterEach es INCONDICIONAL:
 * un test que espera un rechazo también tiene que limpiar, porque el momento
 * en que importa es justamente cuando el código bajo prueba está roto y la
 * escritura sí ocurrió.
 *
 * Los tests que mutan usan a VEGA (profesora sin cátedras). No tocan a
 * Aguirre: lib/notas.test.ts depende de que siga siendo profesor con su
 * cátedra de Sistemas Digitales división A.
 *
 * Corré con: npm test -- lib/auditoria.test.ts
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { and, desc, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  auditoria as auditoriaTabla,
  catedras as catedrasTabla,
  materias,
  notificaciones as notificacionesTabla,
  perfiles,
} from "@/lib/db/schema"
import { comoUsuario } from "@/lib/test-support/as-user"

const AGUIRRE = "11111111-1111-1111-1111-111111111111" // profesor
const BLANCO = "22222222-2222-2222-2222-222222222222" // alumno, 4to A
const VEGA = "77777777-7777-7777-7777-777777777777" // profesora, sin cátedras

/** El usuario falso del bypass sin DEV_BYPASS_USER_ID: el "admin" de estos tests. */
const ADMIN_DEV = "00000000-0000-0000-0000-000000000000"

describe.skipIf(!process.env.DATABASE_URL)(
  "auditoría y notificaciones (integración)",
  () => {
    let sistemasDigitalesId: string

    beforeAll(async () => {
      const [sistemas] = await db
        .select({ id: materias.id })
        .from(materias)
        .where(
          and(eq(materias.nombre, "Sistemas Digitales"), eq(materias.anio, "4to")),
        )
      if (!sistemas) {
        throw new Error(
          "Falta la materia del seed. Corré scripts/seed-test-data.sql.",
        )
      }
      sistemasDigitalesId = sistemas.id
    })

    afterEach(async () => {
      await db
        .update(perfiles)
        .set({ rol: "profesor" })
        .where(eq(perfiles.userId, VEGA))

      await db.delete(catedrasTabla).where(eq(catedrasTabla.profesorId, VEGA))

      await db
        .delete(auditoriaTabla)
        .where(inArray(auditoriaTabla.actorId, [ADMIN_DEV, AGUIRRE, VEGA]))

      await db
        .delete(notificacionesTabla)
        .where(
          inArray(notificacionesTabla.userId, [VEGA, BLANCO, AGUIRRE]),
        )
    })

    it("asignarCatedra deja el movimiento en la auditoría", async () => {
      const { asignarCatedra } = await comoUsuario(null, () =>
        import("@/lib/catedras"),
      )

      const r = await asignarCatedra({
        profesorId: VEGA,
        materiaId: sistemasDigitalesId,
        division: "B",
      })
      expect(r.ok).toBe(true)

      const [registro] = await db
        .select()
        .from(auditoriaTabla)
        .where(eq(auditoriaTabla.accion, "catedra.asignar"))
        .orderBy(desc(auditoriaTabla.createdAt))
        .limit(1)

      expect(registro).toBeDefined()
      expect(registro.actorId).toBe(ADMIN_DEV)
      expect(registro.entidad).toBe("catedra")
      expect(registro.detalle).toMatchObject({
        profesorId: VEGA,
        materia: "Sistemas Digitales",
        curso: "4to B",
      })
    })

    it("asignarCatedra le avisa al profesor", async () => {
      const { asignarCatedra } = await comoUsuario(null, () =>
        import("@/lib/catedras"),
      )

      await asignarCatedra({
        profesorId: VEGA,
        materiaId: sistemasDigitalesId,
        division: "B",
      })

      const avisos = await db
        .select()
        .from(notificacionesTabla)
        .where(eq(notificacionesTabla.userId, VEGA))

      expect(avisos).toHaveLength(1)
      expect(avisos[0].tipo).toBe("catedra")
      expect(avisos[0].leidaAt).toBeNull()
      expect(avisos[0].cuerpo).toContain("Sistemas Digitales")
    })

    it("cambiarRol guarda el rol anterior y el nuevo", async () => {
      const { cambiarRol } = await comoUsuario(null, () =>
        import("@/lib/catedras"),
      )

      const r = await cambiarRol({ userId: VEGA, rol: "alumno" })
      expect(r.ok).toBe(true)

      const [registro] = await db
        .select()
        .from(auditoriaTabla)
        .where(eq(auditoriaTabla.accion, "usuario.rol"))
        .orderBy(desc(auditoriaTabla.createdAt))
        .limit(1)

      expect(registro.detalle).toMatchObject({
        rolAnterior: "profesor",
        rolNuevo: "alumno",
      })
      expect(registro.entidadId).toBe(VEGA)
    })

    it("una acción rechazada no deja rastro en la auditoría", async () => {
      // Aguirre es profesor, no admin: asignarCatedra tiene que tirar antes
      // de tocar nada. Si el registro quedara igual, la auditoría estaría
      // contando movimientos que nunca pasaron.
      const { asignarCatedra } = await comoUsuario(AGUIRRE, () =>
        import("@/lib/catedras"),
      )

      await expect(
        asignarCatedra({
          profesorId: VEGA,
          materiaId: sistemasDigitalesId,
          division: "B",
        }),
      ).rejects.toThrow(/permiso/i)

      const registros = await db
        .select()
        .from(auditoriaTabla)
        .where(eq(auditoriaTabla.actorId, AGUIRRE))

      expect(registros).toHaveLength(0)
    })

    it("listarAuditoria rechaza a un profesor", async () => {
      const { listarAuditoria } = await comoUsuario(AGUIRRE, () =>
        import("@/lib/auditoria"),
      )

      await expect(listarAuditoria()).rejects.toThrow(/permiso/i)
    })

    it("listarAuditoria rechaza a un alumno", async () => {
      const { listarAuditoria } = await comoUsuario(BLANCO, () =>
        import("@/lib/auditoria"),
      )

      await expect(listarAuditoria()).rejects.toThrow(/permiso/i)
    })

    it("misNotificaciones solo devuelve las propias", async () => {
      await db.insert(notificacionesTabla).values([
        { userId: VEGA, tipo: "catedra", titulo: "Para Vega" },
        { userId: BLANCO, tipo: "nota", titulo: "Para Blanco" },
      ])

      const { misNotificaciones } = await comoUsuario(BLANCO, () =>
        import("@/lib/notificaciones"),
      )

      const mias = await misNotificaciones()
      expect(mias.map((n) => n.titulo)).toEqual(["Para Blanco"])
    })

    it("marcarLeida no puede marcar la notificación de otro", async () => {
      const [deVega] = await db
        .insert(notificacionesTabla)
        .values({ userId: VEGA, tipo: "catedra", titulo: "Para Vega" })
        .returning({ id: notificacionesTabla.id })

      // Blanco tiene el id de la notificación de Vega, que es todo lo que
      // llega del cliente. No le tiene que alcanzar.
      const { marcarLeida } = await comoUsuario(BLANCO, () =>
        import("@/lib/notificaciones"),
      )

      await marcarLeida(deVega.id)

      const [sigueSinLeer] = await db
        .select({ leidaAt: notificacionesTabla.leidaAt })
        .from(notificacionesTabla)
        .where(eq(notificacionesTabla.id, deVega.id))

      expect(sigueSinLeer.leidaAt).toBeNull()
    })

    it("marcarTodasLeidas solo toca las del que llama", async () => {
      await db.insert(notificacionesTabla).values([
        { userId: VEGA, tipo: "catedra", titulo: "Para Vega" },
        { userId: BLANCO, tipo: "nota", titulo: "Para Blanco" },
      ])

      const { marcarTodasLeidas } = await comoUsuario(BLANCO, () =>
        import("@/lib/notificaciones"),
      )
      await marcarTodasLeidas()

      const [deVega] = await db
        .select({ leidaAt: notificacionesTabla.leidaAt })
        .from(notificacionesTabla)
        .where(eq(notificacionesTabla.userId, VEGA))
      const [deBlanco] = await db
        .select({ leidaAt: notificacionesTabla.leidaAt })
        .from(notificacionesTabla)
        .where(eq(notificacionesTabla.userId, BLANCO))

      expect(deVega.leidaAt).toBeNull()
      expect(deBlanco.leidaAt).not.toBeNull()
    })

    it("crearUsuario rechaza a un profesor antes de tocar Supabase", async () => {
      // Importa: `crearUsuario` usa la service role key. Si el chequeo de rol
      // se rompiera, un profesor podría crearse un admin. El test corre sin
      // SUPABASE_SERVICE_ROLE_KEY seteada en CI, así que si el rechazo no
      // ocurriera, el error sería otro ("Falta SUPABASE_SERVICE_ROLE_KEY") y
      // este expect fallaría igual.
      const { crearUsuario } = await comoUsuario(AGUIRRE, () =>
        import("@/lib/usuarios"),
      )

      await expect(
        crearUsuario({
          email: "intruso@test.local",
          nombre: "Intruso",
          rol: "admin",
          password: "unaClaveLarga1",
        }),
      ).rejects.toThrow(/permiso/i)
    })
  },
)
