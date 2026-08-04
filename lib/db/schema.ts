import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  unique,
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
