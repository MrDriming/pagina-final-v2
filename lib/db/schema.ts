import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  unique,
  index,
  jsonb,
} from "drizzle-orm/pg-core"

/**
 * Perfil de la aplicación, 1:1 con `auth.users` de Supabase.
 *
 * `userId` es el mismo UUID que `auth.users.id`. La fila la crea sola el
 * trigger `on_auth_user_created` (ver `drizzle/0001_supabase_auth.sql`),
 * leyendo `raw_user_meta_data` del signup.
 *
 * OJO: la FK contra `auth.users` y los triggers viven en ese SQL manual,
 * fuera del schema de Drizzle. Usá `drizzle-kit generate` + `migrate`,
 * NUNCA `drizzle-kit push`, o el push te los borra al no verlos acá.
 *
 * SEGUNDA TRAMPA, si escribís una migración a mano: el `when` que le pongas
 * en `drizzle/meta/_journal.json` tiene que ser MAYOR que el de la última
 * aplicada. El migrador compara ese número contra el `created_at` más alto
 * de `drizzle.__drizzle_migrations`, así que con un timestamp bajo el
 * comando dice "migrations applied successfully" y no aplica nada. Usá
 * `Date.now()` al momento de crearla. Ya pasó una vez con
 * `0005_seed_materias`.
 */
export const perfiles = pgTable("perfiles", {
  userId: uuid("user_id").primaryKey(),
  nombre: text("nombre").notNull().default(""),
  rol: text("rol")
    .$type<"alumno" | "profesor" | "admin">()
    .notNull()
    .default("alumno"),
  anio: text("anio"),
  division: text("division"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

/** Catálogo de materias. Cada materia pertenece a un año del plan. */
export const materias = pgTable(
  "materias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    anio: text("anio").notNull(),
  },
  (t) => [unique("materias_nombre_anio_key").on(t.nombre, t.anio)],
)

/**
 * Quién dicta qué. Esta tabla decide todos los permisos sobre notas.
 * El año no está acá: sale de `materias.anio`.
 */
export const catedras = pgTable(
  "catedras",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profesorId: uuid("profesor_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    materiaId: uuid("materia_id")
      .notNull()
      .references(() => materias.id, { onDelete: "cascade" }),
    division: text("division").notNull(),
  },
  (t) => [
    unique("catedras_profesor_materia_division_key").on(
      t.profesorId,
      t.materiaId,
      t.division,
    ),
  ],
)

/** Calificaciones por trimestre, una fila por alumno + materia + ciclo. */
export const calificaciones = pgTable(
  "calificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alumnoId: uuid("alumno_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    materiaId: uuid("materia_id")
      .notNull()
      .references(() => materias.id),
    cicloLectivo: integer("ciclo_lectivo").notNull(),
    trimestre1: integer("trimestre_1"),
    trimestre2: integer("trimestre_2"),
    trimestre3: integer("trimestre_3"),
    actualizadoPor: uuid("actualizado_por").references(() => perfiles.userId),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    unique("calificaciones_alumno_materia_ciclo_key").on(
      t.alumnoId,
      t.materiaId,
      t.cicloLectivo,
    ),
  ],
)

/**
 * Registro de auditoría: qué hizo cada usuario y cuándo.
 *
 * El nombre y el rol del actor se guardan COPIADOS, no por join. Si el
 * usuario se borra o lo degradan de profesor a alumno, el registro tiene que
 * seguir diciendo quién era en ese momento; un join contra `perfiles` diría
 * lo que es hoy.
 *
 * `actor_id` NO tiene foreign key contra `perfiles`, a propósito. Un registro
 * de auditoría no puede depender de que la fila referenciada siga existiendo:
 * el día que se borre a alguien, lo que hizo tiene que seguir estando, con su
 * id incluido. La integridad referencial acá jugaría en contra.
 *
 * Nadie escribe salvo `lib/auditoria.ts`, y nadie actualiza ni borra: un
 * registro de auditoría editable no sirve para nada.
 */
export const auditoria = pgTable(
  "auditoria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorNombre: text("actor_nombre").notNull().default(""),
    actorRol: text("actor_rol").notNull().default(""),
    /** Verbo de lo que pasó: `nota.guardar`, `usuario.crear`, etc. */
    accion: text("accion").notNull(),
    /** Sobre qué: `calificacion`, `perfil`, `catedra`. */
    entidad: text("entidad").notNull(),
    entidadId: text("entidad_id"),
    /** Contexto libre: valores viejos y nuevos, nombres, materia. */
    detalle: jsonb("detalle").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("auditoria_created_at_idx").on(t.createdAt),
    index("auditoria_actor_idx").on(t.actorId),
  ],
)

/**
 * Notificaciones en la campana de la topbar. Una fila por destinatario: si
 * un hecho le interesa a tres personas, se escriben tres filas. Es más simple
 * que una tabla de "leídas" aparte y hace que marcar como leída sea un UPDATE
 * sobre la propia fila.
 */
export const notificaciones = pgTable(
  "notificaciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => perfiles.userId, { onDelete: "cascade" }),
    tipo: text("tipo").notNull(),
    titulo: text("titulo").notNull(),
    cuerpo: text("cuerpo").notNull().default(""),
    /** Ruta interna a la que lleva el click. Siempre relativa. */
    link: text("link"),
    leidaAt: timestamp("leida_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("notificaciones_user_idx").on(t.userId, t.createdAt)],
)

// Tabla para Consultas Docentes
export const consultas = pgTable("consultas", {
  id: uuid("id").primaryKey().defaultRandom(),
  alumnoId: uuid("alumno_id").notNull(),
  profesorId: uuid("profesor_id").notNull(),
  materia: text("materia").notNull(),
  mensaje: text("mensaje").notNull(),
  respuesta: text("respuesta"),
  estado: text("estado").default("pendiente"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})
