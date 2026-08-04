import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core"

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
  catedras: text("catedras").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

// Tabla de Calificaciones configurada por TRIMESTRES
export const calificaciones = pgTable("calificaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  alumnoId: uuid("alumno_id").notNull(),
  materia: text("materia").notNull(),
  trimestre1: integer("trimestre_1"),
  trimestre2: integer("trimestre_2"),
  trimestre3: integer("trimestre_3"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
})

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
